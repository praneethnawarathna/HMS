const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Student = require('../model/Student');
const Allocation = require('../model/Allocation');
const Payment = require('../model/Payment');
const Hostel = require('../model/Hostel');
const SpecialNeeds = require('../model/SpecialNeeds');
const EmergencyContact = require('../model/EmergencyContact');
const User = require('../model/User');

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(value) {
    let email = typeof value === 'string' ? value : String(value ?? '');
    email = email.trim();
    for (let i = 0; i < 2; i++) {
        try {
            const decoded = decodeURIComponent(email);
            if (decoded === email) break;
            email = decoded;
        } catch {
            break;
        }
    }
    return email;
}

function normalizeGender(value) {
    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === 'm' || raw === 'male') return 'Male';
    if (raw === 'f' || raw === 'female') return 'Female';
    if (raw === 'rev' || raw === 'reverend') return 'REV';
    return null;
}

function getCompatibleIdFilter(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return null;

    const candidates = [normalizedId];
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
        candidates.unshift(new mongoose.Types.ObjectId(normalizedId));
    }

    return {
        _id: candidates.length === 1
            ? candidates[0]
            : { $in: candidates }
    };
}

async function findStudentByIdCompatible(id) {
    const filter = getCompatibleIdFilter(id);
    if (!filter) return null;

    // Native lookup avoids Mongoose casting restored string IDs to ObjectId.
    return Student.collection.findOne(filter);
}

// Geocoding function using OpenCage API
async function geocodeWithOpenCage(address) {
    try {
        const apiKey = process.env.OPENCAGE_API_KEY;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`;

        const response = await axios.get(url);
        const result = response.data.results[0];
        return result ? { lat: result.geometry.lat, lng: result.geometry.lng } : null;
    } catch (error) {
        console.error(`OpenCage error for "${address}":`, error.message);
        return null;
    }
}

// Geocoding function using Nominatim (OpenStreetMap) — free, no API key needed
async function geocodeWithNominatim(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=5&addressdetails=1`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'HMS-App/1.0' }
        });
        if (!response.data || response.data.length === 0) return null;

        const preferred = response.data.find(r =>
            ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood'].includes(r.type)
        );
        const best = preferred || response.data[0];
        return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    } catch (error) {
        console.error(`Nominatim geocode error for "${address}":`, error.message);
        return null;
    }
}

// Function to calculate road distance using OSRM
async function getRoadDistanceOSRM(start, end) {
    try {
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false&alternatives=false&steps=false`;

        const response = await axios.get(osrmUrl);
        const distance = response.data.routes[0].legs[0].distance;
        return Math.ceil(distance / 1000); // km, rounded up
    } catch (error) {
        console.error('Error getting road distance from OSRM:', error.message);
        return null;
    }
}

// Helper: get distance (km) using Google Directions API
async function getDistanceWithGoogleDirections(origin, dest, apiKey) {
    try {
        // Request alternative routes and pick the shortest by distance to better match Google Maps UI
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&key=${apiKey}&mode=driving&alternatives=true&departure_time=now&t&units=metric`;
        const resp = await axios.get(url);
        if (!resp.data || resp.data.status !== 'OK') {
            const errMsg = resp.data && resp.data.error_message ? resp.data.error_message : (resp.data && resp.data.status) || 'UNKNOWN';
            console.warn('[getDistanceWithGoogleDirections] Google Directions returned:', errMsg);
            return null;
        }

        const routes = resp.data.routes || [];
        if (!routes.length) {
            console.warn('[getDistanceWithGoogleDirections] No routes returned');
            return null;
        }

        // Compute distance for each route (sum of leg distances) and pick the minimum
        const routeDistancesMeters = routes.map(rt => {
            const legs = rt.legs || [];
            return legs.reduce((sum, lg) => sum + ((lg && lg.distance && typeof lg.distance.value === 'number') ? lg.distance.value : 0), 0);
        });

        const validDistances = routeDistancesMeters.filter(d => d > 0);
        if (!validDistances.length) {
            console.warn('[getDistanceWithGoogleDirections] No valid leg distances in routes');
            return null;
        }

        const minMeters = Math.min(...validDistances);
        return Math.ceil(minMeters / 1000); // meters -> km, rounded up
    } catch (err) {
        console.error('[getDistanceWithGoogleDirections] Exception:', err.message);
        return null;
    }
}

// Helper: get distance (km) using Google Distance Matrix API (driving)
async function getDistanceWithDistanceMatrix(origin, dest, apiKey) {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dest)}&key=${apiKey}&units=metric`;
        const resp = await axios.get(url);
        if (!resp.data || resp.data.status !== 'OK') {
            console.warn('[getDistanceWithDistanceMatrix] response status:', resp.data && resp.data.status);
            return null;
        }
        const el = resp.data.rows?.[0]?.elements?.[0];
        if (el && el.status === 'OK' && el.distance && typeof el.distance.value === 'number') {
            return Math.ceil(el.distance.value / 1000); // meters -> km, rounded up
        }
        console.warn('[getDistanceWithDistanceMatrix] element missing or not OK');
        return null;
    } catch (err) {
        console.error('[getDistanceWithDistanceMatrix] Exception:', err.message);
        return null;
    }
}

/**
 * Transit Distance Matrix — bus only, arriving by a given time.
 *
 * Uses arrival_time so the API calculates the journey backwards from the desired arrival time.
 *
 * Parameters sent to the API:
 *  mode=transit                           → public transit
 *  transit_mode=bus                       → prefer bus routes
 *  arrival_time                           → Unix epoch (seconds) when student needs to arrive
 *  transit_routing_preference=fewer_transfers → fewest changes (most direct / optimistic)
 *
 * NOTE: avoid (highways|tolls|ferries) and traffic_model are DRIVING-only
 *       and are silently ignored when mode=transit.
 *
 * @param {string} origin
 * @param {string} dest
 * @param {string} apiKey
 * @param {number} arrivalUnix  Unix timestamp (seconds) of arrival time
 * @returns {Promise<{distanceKm, durationSec, durationText, source, apiStatus}>}
 */
async function getTransitDistanceMatrix(origin, dest, apiKey, arrivalUnix) {
    try {
        const params = new URLSearchParams({
            origins: origin,
            destinations: dest,
            key: apiKey,
            units: 'metric',
            mode: 'transit',
            transit_mode: 'bus',
            transit_routing_preference: 'fewer_transfers', // most direct route / optimistic
            arrival_time: String(Math.round(arrivalUnix)),
        });

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
        console.log('[getTransitDistanceMatrix] Calling Transit DM API...');

        const resp = await axios.get(url);
        const data = resp.data;

        if (!data || data.status !== 'OK') {
            console.warn('[getTransitDistanceMatrix] Top-level status:', data && data.status, data && data.error_message);
            return { distanceKm: null, durationSec: null, durationText: null, apiStatus: data && data.status };
        }

        const el = data.rows?.[0]?.elements?.[0];
        if (!el || el.status !== 'OK') {
            console.warn('[getTransitDistanceMatrix] Element status:', el && el.status);
            return { distanceKm: null, durationSec: null, durationText: null, apiStatus: 'ELEMENT_NOT_OK' };
        }

        const distanceKm = el.distance && typeof el.distance.value === 'number'
            ? Math.ceil(el.distance.value / 1000) : null;
        const durationSec = el.duration && typeof el.duration.value === 'number'
            ? el.duration.value : null;
        const durationText = el.duration && el.duration.text ? el.duration.text : null;

        return { distanceKm, durationSec, durationText, apiStatus: 'OK' };
    } catch (err) {
        console.error('[getTransitDistanceMatrix] Exception:', err.message);
        return { distanceKm: null, durationSec: null, durationText: null, apiStatus: 'EXCEPTION', error: err.message };
    }
}

// Simple in-memory cache for geocoding/place_id results
const placeCache = new Map();

// Helper: get place_id, formatted address and location from Geocoding API (cached)
async function getPlaceInfo(address, apiKey) {
    if (!address) return null;
    const key = address.trim();
    if (placeCache.has(key)) return placeCache.get(key);

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const resp = await axios.get(url);
        const r = resp.data && Array.isArray(resp.data.results) && resp.data.results[0];
        if (!r) {
            placeCache.set(key, null);
            return null;
        }
        const info = {
            place_id: r.place_id,
            formatted_address: r.formatted_address,
            location: r.geometry && r.geometry.location ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng } : null
        };
        placeCache.set(key, info);
        return info;
    } catch (err) {
        console.error('[getPlaceInfo] Geocode error for', address, err.message);
        placeCache.set(key, null);
        return null;
    }
}

// ── Shared helper: calculate distance ──
// Priority order:
//   1. Transit Distance Matrix API  (bus, arrival_time = 8:00 AM tomorrow)
//   2. Driving Distance Matrix API  (fallback when transit returns ZERO_RESULTS)
//   3. Nominatim + OSRM            (free, no API key needed)
//   4. OpenCage + OSRM             (free fallback)
//
// Returns: { distanceKm, durationSec, durationText, source }
//   distanceKm  – km stored on the Student document
//   durationSec – bus journey duration in seconds (null for non-transit sources)
//   durationText– human string e.g. "2 hours 15 mins"
//   source      – which provider was used
const universityAddress = process.env.UNIVERSITY_ADDRESS || 'Gymnasium, University of Peradeniya, 20400';

// Returns Unix timestamp (seconds) for 8:00 AM the next calendar day (local server time).
// Used as arrival_time so the transit API computes the actual travelling path to arrive by 8 AM.
function nextDayArrival8AM() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // arrive by 8 AM next day
    return Math.round(tomorrow.getTime() / 1000);
}

async function calculateDistance(originAddress) {
    if (!originAddress) {
        console.log('[calculateDistance] No origin address provided — skipping.');
        return { distanceKm: null, durationSec: null, durationText: null, source: null };
    }

    console.log('[calculateDistance] Computing distance for:', originAddress);

    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;

            // Resolve place_id / coords once — shared by both transit and driving calls
            const [originInfo, uniInfo] = await Promise.all([
                getPlaceInfo(originAddress, apiKey),
                getPlaceInfo(universityAddress, apiKey),
            ]);
            const originParam = originInfo && originInfo.place_id
                ? `place_id:${originInfo.place_id}`
                : (originInfo && originInfo.location
                    ? `${originInfo.location.lat},${originInfo.location.lng}`
                    : originAddress);
            const destParam = uniInfo && uniInfo.place_id
                ? `place_id:${uniInfo.place_id}`
                : (uniInfo && uniInfo.location
                    ? `${uniInfo.location.lat},${uniInfo.location.lng}`
                    : universityAddress);

            // ── Priority 1: Transit Distance Matrix (bus, arrival 8 AM tomorrow) ──
            console.log('[calculateDistance] Priority 1 — Transit DM (bus, arrival_time 8 AM tomorrow)...');
            const arrivalUnix = nextDayArrival8AM();
            const transitResult = await getTransitDistanceMatrix(originParam, destParam, apiKey, arrivalUnix);

            if (transitResult.apiStatus === 'OK' && transitResult.distanceKm !== null) {
                console.log(`[calculateDistance] Transit DM OK: ${transitResult.distanceKm} km, travel time: ${transitResult.durationText}`);
                return {
                    distanceKm: transitResult.distanceKm,
                    durationSec: transitResult.durationSec,
                    durationText: transitResult.durationText,
                    source: 'transit-distance-matrix',
                };
            }
            console.warn('[calculateDistance] Transit DM status:', transitResult.apiStatus, '— falling back to driving...');

            // ── Priority 2: Driving (Directions or Distance Matrix) ──
            const useDirections = /^(1|true)$/i.test(process.env.GOOGLE_MAPS_USE_DIRECTIONS || '');
            if (useDirections) {
                console.log('[calculateDistance] Priority 2 — Driving Directions API...');
                const km = await getDistanceWithGoogleDirections(originParam, destParam, apiKey);
                if (km !== null) {
                    return { distanceKm: +km.toFixed(2), durationSec: null, durationText: null, source: 'driving-directions' };
                }
            }
            console.log('[calculateDistance] Priority 2 — Driving Distance Matrix...');
            const dmKm = await getDistanceWithDistanceMatrix(originParam, destParam, apiKey);
            if (dmKm !== null) {
                return { distanceKm: +dmKm.toFixed(2), durationSec: null, durationText: null, source: 'driving-distance-matrix' };
            }
        } catch (err) {
            console.error('[calculateDistance] Google API exception:', err.message);
        }
    } else {
        console.log('[calculateDistance] No GOOGLE_MAPS_API_KEY — skipping Google.');
    }

    // ── Priority 3: Nominatim + OSRM ──
    try {
        console.log('[calculateDistance] Priority 3 — Nominatim + OSRM...');
        const studentCoords = await geocodeWithNominatim(originAddress);
        const uniCoords = await geocodeWithNominatim(universityAddress);
        if (studentCoords && uniCoords) {
            const dkm = await getRoadDistanceOSRM(studentCoords, uniCoords);
            if (dkm !== null) {
                return { distanceKm: +dkm.toFixed(2), durationSec: null, durationText: null, source: 'nominatim-osrm' };
            }
        }
    } catch (err) {
        console.error('[calculateDistance] Nominatim/OSRM error:', err.message);
    }

    // ── Priority 4: OpenCage + OSRM ──
    if (process.env.OPENCAGE_API_KEY) {
        try {
            console.log('[calculateDistance] Priority 4 — OpenCage + OSRM...');
            const studentCoords = await geocodeWithOpenCage(originAddress);
            const uniCoords = await geocodeWithOpenCage(universityAddress);
            if (studentCoords && uniCoords) {
                const dkm = await getRoadDistanceOSRM(studentCoords, uniCoords);
                if (dkm !== null) {
                    return { distanceKm: +dkm.toFixed(2), durationSec: null, durationText: null, source: 'opencage-osrm' };
                }
            }
        } catch (err) {
            console.error('[calculateDistance] OpenCage/OSRM fallback error:', err.message);
        }
    }

    console.log('[calculateDistance] All providers failed — returning null.');
    return { distanceKm: null, durationSec: null, durationText: null, source: null };
}


const StudentController = {
    // Debug endpoint: return both Directions and Distance Matrix distances for comparison
    debugDistance: async (req, res) => {
        try {
            const { origin } = req.query;
            if (!origin) return res.status(400).json({ Status: 'Fail', Error: 'origin query parameter is required' });

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) return res.status(500).json({ Status: 'Fail', Error: 'GOOGLE_MAPS_API_KEY not configured on server.' });

            const dest = universityAddress;

            const [directionsKm, matrixKm] = await Promise.all([
                getDistanceWithGoogleDirections(origin, dest, apiKey),
                getDistanceWithDistanceMatrix(origin, dest, apiKey)
            ]);

            return res.json({ Status: 'Success', origin, destination: dest, directionsKm, matrixKm });
        } catch (err) {
            console.error('debugDistance error:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    },
    createstdviaSheet: async (req, res) => {
        try {
            const filePath = req.file.path;
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const studentsFromExcel = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const insertedStudents = [];
            const duplicateStudents = [];

            const uploadId = req.body.uploadId;
            if (uploadId) {
                global.uploadProgress = global.uploadProgress || {};
                global.uploadProgress[uploadId] = { current: 0, total: studentsFromExcel.length };
            }

            let processedCount = 0;
            for (const s of studentsFromExcel) {
                processedCount++;
                if (uploadId) {
                    global.uploadProgress[uploadId].current = processedCount;
                }
                // Normalize header keys (remove non-word chars, lowercase) to tolerate different Excel header names
                const norm = {};
                Object.keys(s || {}).forEach(k => {
                    const nk = k.replace(/\W/g, '').toLowerCase();
                    norm[nk] = s[k];
                });
                const get = (k) => norm[k.replace(/\W/g, '').toLowerCase()];

                // Determine enrolment number and trim any leading/trailing spaces
                let enrolVal = get('Enrolment_No.') || get('enrolmentno') || get('Enrollment_No.') || get('enrollmentno');
                if (typeof enrolVal === 'string') {
                    enrolVal = enrolVal.trim();
                }

                const idField = enrolVal;
                if (!idField) {
                    // No reliable unique id -> skip this row
                    duplicateStudents.push(null);
                    continue;
                }

                const exists = await Student.findOne({ enrolmentNo: enrolVal });

                if (exists) {
                    duplicateStudents.push(idField);
                    continue;
                }

                const studentData = {
                    no: get('No'),
                    name: get('Name'),
                    alDistrict: get('alDistrict') || get('aldistrict'),
                    sex: normalizeGender(get('Sex') ?? get('Gender')),
                    nic: get('NIC'),
                    address1: get('ADD1') || get('add1'),
                    address2: get('ADD2') || get('add2'),
                    address3: get('ADD3') || get('add3'),
                    fullAddress: get('Address') || get('fullAddress'),
                    intake: get('Intake'),
                    dateOfEnrolment: get('Date_of_Enollment') || get('dateofenrolment') || get('dateofenrollment') || get('dateofenrollment') || get('dateofenrollment'),
                    department: get('Department') || get('department'),
                    batchYear: get('Batch_Year') || get('batchyear'),
                    studyYear: get('Study_Year') || get('studyyear'),
                    distance: null,
                    isAssign: false,
                    eligibilityStatus: 'Not Eligible'
                };

                // Only set enrolmentNo if present (avoid explicit nulls which trigger unique index conflicts)
                if (enrolVal) studentData.enrolmentNo = enrolVal;

                // Auto-calculate distance using combined address for better accuracy
                const originAddress = studentData.fullAddress
                    || [studentData.address1, studentData.address2, studentData.address3].filter(Boolean).join(', ')
                    || studentData.address3;
                if (originAddress) {
                    const searchAddress = /sri\s*lanka/i.test(originAddress) ? originAddress : `${originAddress}, Sri Lanka`;
                    const distResult = await calculateDistance(searchAddress);
                    if (distResult.distanceKm !== null) {
                        studentData.distance = distResult.distanceKm;
                        studentData.transitDurationSec = distResult.durationSec || null;
                        studentData.transitDurationText = distResult.durationText || null;
                        studentData.distanceSource = distResult.source || null;
                    }
                    console.log(`[sheet] ${studentData.enrolmentNo || '?'} → ${distResult.distanceKm} km (${distResult.durationText || 'n/a'}) via ${distResult.source}`);
                    // small delay to avoid rate limits
                    await new Promise(rp => setTimeout(rp, 300));
                }

                insertedStudents.push(studentData);
            }

            // Use unordered bulkWrite so duplicate-key errors skip only failing rows
            let insertedCount = 0;
            if (insertedStudents.length) {
                // Diagnostic logging to help debug upload issues
                console.log('[createstdviaSheet] total rows in sheet:', studentsFromExcel.length);
                console.log('[createstdviaSheet] prepared documents for insert:', insertedStudents.length);
                console.log('[createstdviaSheet] skipped/duplicate candidates so far:', duplicateStudents.length);
                console.log('[createstdviaSheet] sample prepared docs:', insertedStudents.slice(0, 5).map(d => ({ enrolmentNo: d.enrolmentNo || null })));
                const ops = insertedStudents.map(doc => ({ insertOne: { document: doc } }));
                try {
                    const bulkRes = await Student.bulkWrite(ops, { ordered: false });
                    insertedCount = bulkRes.insertedCount || bulkRes.nInserted || 0;
                } catch (err) {
                    // Bulk write may throw — extract inserted count and which indexes failed
                    console.warn('Partial bulkWrite error:', err.message || err);
                    if (err.result && typeof err.result.insertedCount === 'number') {
                        insertedCount = err.result.insertedCount;
                    } else if (err.result && typeof err.result.nInserted === 'number') {
                        insertedCount = err.result.nInserted;
                    } else if (Array.isArray(err.insertedDocs)) {
                        insertedCount = err.insertedDocs.length;
                    }

                    // Map writeErrors back to original rows and record their id values
                    if (Array.isArray(err.writeErrors)) {
                        for (const we of err.writeErrors) {
                            const idx = we.index;
                            const doc = insertedStudents[idx];
                            let id = (doc && doc.enrolmentNo) || null;
                            if (typeof id === 'string') id = id.trim();
                            duplicateStudents.push(id);
                        }
                    }

                    // continue — we've recorded failed rows and extracted insertedCount where possible
                }
            }

            if (uploadId && global.uploadProgress) {
                delete global.uploadProgress[uploadId];
            }

            res.json({
                Status: "Success",
                Message: 'Upload complete',
                insertedCount,
                duplicateCount: duplicateStudents.length,
                duplicates: duplicateStudents
            });
        }
        catch (err) {
            console.error("Error in createstdviaSheet:", err);
            const uploadId = req.body && req.body.uploadId;
            if (uploadId && global.uploadProgress) {
                delete global.uploadProgress[uploadId];
            }
            return res.status(500).json({ Status: "Fail", Error: "Internal server error" });
        }
    },

    getUploadProgress: async (req, res) => {
        const { uploadId } = req.params;
        const progress = global.uploadProgress && global.uploadProgress[uploadId]
            ? global.uploadProgress[uploadId]
            : { current: 0, total: 0 };
        return res.json({ Status: 'Success', progress });
    },

    // Upload Excel and compute student -> university distance using Google Distance Matrix API
    uploadStudentsDistanceGoogle: async (req, res) => {
        try {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) return res.status(500).json({ Status: 'Fail', Error: 'GOOGLE_MAPS_API_KEY not configured on server.' });

            const filePath = req.file.path;
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const results = [];
            for (const r of rows) {
                const address = r['Address'] || r['fullAddress'] || r['HomeAddress'] || r['ADD3'] || r['ADD1'] || r['Address1'];
                let enrolmentNoVal = r['Enrolment_No.'] || r['enrolmentNo'] || r['Enrollment_No.'] || r['enrollmentNo'] || r['enrolmentno'] || r['enrollmentno'];
                if (typeof enrolmentNoVal === 'string') enrolmentNoVal = enrolmentNoVal.trim();
                const idField = enrolmentNoVal;

                if (!address) {
                    results.push({ id: idField || null, status: 'Skipped', reason: 'No address found in row' });
                    continue;
                }

                const useDirections = /^(1|true)$/i.test(process.env.GOOGLE_MAPS_USE_DIRECTIONS || '');

                try {
                    // prefer place_id or coords for origin/destination
                    const originInfo = await getPlaceInfo(address, apiKey);
                    const uniInfo = await getPlaceInfo(universityAddress, apiKey);
                    const originParam = originInfo && originInfo.place_id ? `place_id:${originInfo.place_id}` : (originInfo && originInfo.location ? `${originInfo.location.lat},${originInfo.location.lng}` : address);
                    const destParam = uniInfo && uniInfo.place_id ? `place_id:${uniInfo.place_id}` : (uniInfo && uniInfo.location ? `${uniInfo.location.lat},${uniInfo.location.lng}` : universityAddress);

                    let distanceKm = null;
                    if (useDirections) {
                        const km = await getDistanceWithGoogleDirections(originParam, destParam, apiKey);
                        if (km === null) {
                            results.push({ id: idField || null, status: 'Fail', reason: 'Google Directions returned no route' });
                            continue;
                        }
                        distanceKm = +km.toFixed(2);
                    } else {
                        const dmKm = await getDistanceWithDistanceMatrix(originParam, destParam, apiKey);
                        if (dmKm === null) {
                            results.push({ id: idField || null, status: 'Fail', reason: 'Distance Matrix returned no element' });
                            continue;
                        }
                        distanceKm = +dmKm.toFixed(2);
                    }

                    let updated = null;
                    if (idField) {
                        const query = { enrolmentNo: idField };
                        updated = await Student.findOneAndUpdate(query, { distance: distanceKm }, { new: true });
                    }

                    results.push({ id: idField || null, status: 'OK', distanceKm, updated: !!updated });
                } catch (err) {
                    console.error('Google API error for', address, err.message);
                    results.push({ id: idField || null, status: 'Error', reason: err.message });
                }

                await new Promise(rp => setTimeout(rp, 200));
            }

            return res.json({ Status: 'Success', Message: 'Distance calculation finished', results });
        } catch (err) {
            console.error('uploadStudentsDistanceGoogle error:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    },

    // Process an already-uploaded Excel file (filename provided in body)
    processUploadedFile: async (req, res) => {
        try {
            const { filename } = req.body;
            if (!filename) return res.status(400).json({ Status: 'Fail', Error: 'filename is required in body' });

            const uploadsPath = path.join(__dirname, '..', 'uploads');
            const filePath = path.join(uploadsPath, filename);

            const fs = require('fs');
            if (!fs.existsSync(filePath)) return res.status(404).json({ Status: 'Fail', Error: 'File not found on server' });

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) return res.status(500).json({ Status: 'Fail', Error: 'GOOGLE_MAPS_API_KEY not configured on server.' });

            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const results = [];
            for (const r of rows) {
                const address = r['Address'] || r['fullAddress'] || r['HomeAddress'] || r['ADD3'] || r['ADD1'] || r['Address1'];
                const idField = r['Enrolment_No.'] || r['enrolmentNo'] || r['email'];

                if (!address) {
                    results.push({ id: idField || null, status: 'Skipped', reason: 'No address found in row' });
                    continue;
                }

                const useDirections = /^(1|true)$/i.test(process.env.GOOGLE_MAPS_USE_DIRECTIONS || '');

                try {
                    // prefer place_id or coords for origin/destination
                    const originInfo = await getPlaceInfo(address, apiKey);
                    const uniInfo = await getPlaceInfo(universityAddress, apiKey);
                    const originParam = originInfo && originInfo.place_id ? `place_id:${originInfo.place_id}` : (originInfo && originInfo.location ? `${originInfo.location.lat},${originInfo.location.lng}` : address);
                    const destParam = uniInfo && uniInfo.place_id ? `place_id:${uniInfo.place_id}` : (uniInfo && uniInfo.location ? `${uniInfo.location.lat},${uniInfo.location.lng}` : universityAddress);

                    let distanceKm = null;
                    if (useDirections) {
                        const km = await getDistanceWithGoogleDirections(originParam, destParam, apiKey);
                        if (km === null) {
                            results.push({ id: idField || null, status: 'Fail', reason: 'Google Directions returned no route' });
                            continue;
                        }
                        distanceKm = +km.toFixed(2);
                    } else {
                        const dmKm = await getDistanceWithDistanceMatrix(originParam, destParam, apiKey);
                        if (dmKm === null) {
                            results.push({ id: idField || null, status: 'Fail', reason: 'Distance Matrix returned no element' });
                            continue;
                        }
                        distanceKm = +dmKm.toFixed(2);
                    }

                    let updated = null;
                    if (idField) {
                        const query = {
                            $or: [
                                { enrolmentNo: idField },
                                { email: idField },
                                { nic: idField }
                            ]
                        };
                        updated = await Student.findOneAndUpdate(query, { distance: distanceKm }, { new: true });
                    }

                    results.push({ id: idField || null, status: 'OK', distanceKm, updated: !!updated });
                } catch (err) {
                    console.error('Google API error for', address, err.message);
                    results.push({ id: idField || null, status: 'Error', reason: err.message });
                }

                await new Promise(rp => setTimeout(rp, 200));
            }

            return res.json({ Status: 'Success', Message: 'Processed uploaded file', results });
        } catch (err) {
            console.error('processUploadedFile error:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    },

    createStudentManually: async (req, res) => {
        try {
            const {
                enrolmentNo,
                name,
                alDistrict,
                sex,
                gender,
                nic,
                address1,
                address2,
                address3,
                fullAddress,
                intake,
                dateOfEnrolment,
                distance
            } = req.body;


            const existingStudent = await Student.findOne({ enrolmentNo });

            if (existingStudent) {
                return res.json({ error: "Student already exists with the provided enrolment number." });
            }

            // Auto-calculate distance from address if not provided
            let computedDistance = distance;
            let computedDurationSec = null;
            let computedDurationText = null;
            let computedDistSource = null;
            if (!distance && (address3 || fullAddress || address1 || address2)) {
                const originAddress = fullAddress
                    || [address1, address2, address3].filter(Boolean).join(', ')
                    || address3;
                const searchAddress = /sri\s*lanka/i.test(originAddress)
                    ? originAddress
                    : `${originAddress}, Sri Lanka`;
                const distResult = await calculateDistance(searchAddress);
                computedDistance = distResult.distanceKm;
                computedDurationSec = distResult.durationSec;
                computedDurationText = distResult.durationText;
                computedDistSource = distResult.source;
                console.log(`[createStudentManually] ${enrolmentNo} → ${computedDistance} km (${computedDurationText || 'n/a'}) via ${computedDistSource}`);
            }

            const newStudent = new Student({
                enrolmentNo,
                name,
                alDistrict,
                sex: normalizeGender(gender || sex),
                nic,
                address1,
                address2,
                address3,
                fullAddress,
                intake,
                dateOfEnrolment,
                distance: computedDistance,
                transitDurationSec: computedDurationSec,
                transitDurationText: computedDurationText,
                distanceSource: computedDistSource,
                isAssign: false,
                eligibilityStatus: 'Not Eligible'
            });

            await newStudent.save();

            return res.json({ Status: "Success", message: "Student created successfully", student: newStudent });
        } catch (err) {
            console.error("Error creating student:", err);
            return res.json({ error: "Internal server error" });
        }
    },

    studentGetall: async (req, res) => {
        try {
            const { hostelId } = req.query;

            // If hostelId is provided, return only students currently (active) allocated to that hostel.
            // This makes hostel-wise filtering reliable even when client-side enrichment is missing.
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (hostelId) {
                const hostelIdStr = String(hostelId);
                if (!objectIdPattern.test(hostelIdStr)) {
                    return res.status(400).json({ Error: 'Invalid hostelId query parameter' });
                }

                const hostel = await Hostel.findById(hostelIdStr).select('name').lean();
                const hostelName = hostel?.name || null;

                const allocations = await Allocation.find({ hostelID: hostelIdStr, active: true })
                    .select('studentId regNo')
                    .sort({ inDate: -1, _id: -1 })
                    .lean();

                if (!allocations.length) {
                    return res.json({ Result: [] });
                }

                const studentIdSet = new Set();
                const enrolmentNoSet = new Set();

                allocations.forEach(a => {
                    if (a.studentId) {
                        studentIdSet.add(a.studentId.toString());
                    }
                    if (a.regNo) {
                        const regNo = String(a.regNo);
                        if (objectIdPattern.test(regNo)) {
                            studentIdSet.add(regNo);
                        } else {
                            enrolmentNoSet.add(regNo);
                        }
                    }
                });

                const studentIds = Array.from(studentIdSet);
                const enrolmentNos = Array.from(enrolmentNoSet);

                if (!studentIds.length && !enrolmentNos.length) {
                    return res.json({ Result: [] });
                }

                const students = await Student.find({
                    $or: [
                        ...(studentIds.length ? [{ _id: { $in: studentIds } }] : []),
                        ...(enrolmentNos.length ? [{ enrolmentNo: { $in: enrolmentNos } }] : [])
                    ]
                }).lean();

                const dbStudentIds = students.map(s => s._id);
                const payments = await Payment.find({ type: 'hostel-fee', paymentStatus: 'Paid', studentId: { $in: dbStudentIds } }).lean();
                const feeByStudentId = new Map();
                payments.forEach(p => {
                    feeByStudentId.set(p.studentId.toString(), p.hallFee || p.amount || 0);
                });

                const enriched = (students || []).map(s => ({
                    ...s,
                    hostelId: hostelIdStr,
                    hostelName,
                    hallFee: feeByStudentId.get(s._id.toString()) || null
                }));

                return res.json({ Result: enriched });
            }

            const students = await Student.find().lean();

            if (!students.length) {
                return res.json({ Result: [] });
            }

            const studentIds = students.map(s => s._id.toString());
            const studentIdSet = new Set(studentIds);

            const enrolmentNos = students.map(s => s.enrolmentNo).filter(Boolean);

            const allocationQueryOr = [
                { studentId: { $in: studentIds } },
                { regNo: { $in: studentIds } },
            ];
            if (enrolmentNos.length) {
                allocationQueryOr.push({ regNo: { $in: enrolmentNos } });
            }

            const allocations = await Allocation.find({
                active: true,
                $or: allocationQueryOr
            })
                .sort({ inDate: -1, _id: -1 })
                .populate('hostelID', 'name')
                .lean();

            const enrolToId = new Map();
            students.forEach(s => {
                if (s.enrolmentNo) {
                    enrolToId.set(s.enrolmentNo, s._id.toString());
                }
            });

            const hostelByStudentId = new Map();

            // allocations are sorted latest-first; first match wins per student
            for (const allocation of allocations) {
                let studentKey = null;

                if (allocation.studentId) {
                    studentKey = allocation.studentId.toString();
                }

                if (!studentKey && allocation.regNo) {
                    const regNo = String(allocation.regNo);
                    if (objectIdPattern.test(regNo) && studentIdSet.has(regNo)) {
                        studentKey = regNo;
                    } else if (enrolToId.has(regNo)) {
                        studentKey = enrolToId.get(regNo);
                    }
                }

                if (!studentKey || hostelByStudentId.has(studentKey)) continue;

                const hostelId = allocation.hostelID && (allocation.hostelID._id || allocation.hostelID);
                const hostelName = allocation.hostelID && allocation.hostelID.name ? allocation.hostelID.name : null;
                if (!hostelId && !hostelName) continue;

                hostelByStudentId.set(studentKey, {
                    hostelId: hostelId ? hostelId.toString() : null,
                    hostelName
                });
            }

            const payments = await Payment.find({ type: 'hostel-fee', paymentStatus: 'Paid', studentId: { $in: studentIds } }).lean();
            const feeByStudentId = new Map();
            payments.forEach(p => {
                feeByStudentId.set(p.studentId.toString(), p.hallFee || p.amount || 0);
            });

            const enrichedStudents = students.map(s => {
                const sid = s._id.toString();
                const hostel = hostelByStudentId.get(sid);
                const hallFee = feeByStudentId.get(sid) || null;
                return {
                    ...s,
                    hostelId: hostel ? hostel.hostelId : null,
                    hostelName: hostel ? hostel.hostelName : null,
                    hallFee
                };
            });

            return res.json({ Result: enrichedStudents });
        }
        catch (err) {
            console.log(err)
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    },

    getStudentById: async (req, res) => {
        try {
            const { id } = req.params;
            const findStudent = await findStudentByIdCompatible(id);

            if (!findStudent) {
                return res.status(404).json({
                    Status: 'Fail',
                    Error: 'Student not found',
                    Result: null
                });
            }

            return res.json({ Status: 'Success', Result: findStudent });
        }
        catch (err) {
            console.error('getStudentById error:', err);
            return res.status(500).json({
                Status: 'Fail',
                Error: 'Failed to load student data'
            });
        }
    },

    updateStudent: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                alDistrict,
                sex,
                gender,
                address1,
                address2,
                address3,
                fullAddress,
                intake,
                dateOfEnrolment,
                distance
            } = req.body;

            // Only auto-calculate distance if it's 0 or empty
            let computedDistance = (distance && Number(distance) !== 0) ? Number(distance) : null;
            let computedDurationSec = null;
            let computedDurationText = null;
            let computedDistSource = null;
            const hasAddress = address3 || fullAddress || address1 || address2;

            if (!computedDistance && hasAddress) {
                const originAddress = fullAddress
                    || [address1, address2, address3].filter(Boolean).join(', ')
                    || address3;
                const searchAddress = /sri\s*lanka/i.test(originAddress)
                    ? originAddress
                    : `${originAddress}, Sri Lanka`;
                const distResult = await calculateDistance(searchAddress);
                if (distResult.distanceKm !== null) {
                    computedDistance = distResult.distanceKm;
                    computedDurationSec = distResult.durationSec;
                    computedDurationText = distResult.durationText;
                    computedDistSource = distResult.source;
                    console.log(`[updateStudent] ${id} → ${computedDistance} km (${computedDurationText || 'n/a'}) via ${computedDistSource}`);
                }
            } else if (computedDistance) {
                computedDistSource = 'Manual update';
            }

            let editorName = 'Admin';
            if (req.user && req.user.id) {
                let adminUser = await User.findById(req.user.id);
                if (!adminUser && req.user.email) {
                    adminUser = await User.findOne({ email: req.user.email });
                }
                if (adminUser) {
                    editorName = adminUser.username || adminUser.email || 'Admin';
                }
            }

            const studentUpdate = {
                name,
                alDistrict,
                sex: normalizeGender(gender || sex),
                address1,
                address2,
                address3,
                fullAddress,
                intake,
                dateOfEnrolment,
                distance: computedDistance,
                transitDurationSec: computedDurationSec,
                transitDurationText: computedDurationText,
                distanceSource: computedDistSource,
                lastEditedBy: editorName,
                lastEditedAt: new Date(),
            };

            let updatedStudent = await Student.findByIdAndUpdate(
                id,
                studentUpdate,
                { new: true }
            );

            if (!updatedStudent) {
                const filter = getCompatibleIdFilter(id);
                if (filter) {
                    const nativeUpdate = Object.fromEntries(
                        Object.entries(studentUpdate)
                            .filter(([, value]) => value !== undefined)
                    );

                    if (nativeUpdate.dateOfEnrolment) {
                        const parsedDate = new Date(nativeUpdate.dateOfEnrolment);
                        if (!Number.isNaN(parsedDate.getTime())) {
                            nativeUpdate.dateOfEnrolment = parsedDate;
                        }
                    }

                    const result = await Student.collection.updateOne(
                        filter,
                        { $set: nativeUpdate }
                    );

                    if (result.matchedCount === 1) {
                        updatedStudent = await findStudentByIdCompatible(id);
                    }
                }
            }

            if (!updatedStudent) {
                return res.status(404).json({
                    Status: 'Fail',
                    Error: 'Student not found'
                });
            }

            return res.json({
                Status: "Success",
                Message: 'Student updated successfully',
                student: updatedStudent
            });
        } catch (err) {
            console.error('updateStudent error:', err);
            return res.status(500).json({
                Status: 'Fail',
                Error: 'Internal server error'
            });
        }
    },



    StudentCreateNeeds: async (req, res) => {
        try {
            const { regNo, needs } = req.body;

            if (!regNo || !needs) {
                return res.status(400).json({ Status: 'Fail', Error: 'regNo and needs are required.' });
            }

            const normalizedIdentifier = normalizeEmail(regNo);
            if (!normalizedIdentifier) {
                return res.status(400).json({ Status: 'Fail', Error: 'regNo (enrolmentNo) is required.' });
            }

            // regNo is treated as enrolmentNo (preferred). Fall back to email for backwards compatibility.
            let getstdId = await Student.findOne({ enrolmentNo: normalizedIdentifier });
            if (!getstdId) {
                getstdId = await Student.findOne({ enrolmentNo: new RegExp(`^${escapeRegExp(normalizedIdentifier)}$`, 'i') });
            }
            if (!getstdId) {
                getstdId = await Student.findOne({ email: normalizedIdentifier });
            }
            if (!getstdId) {
                getstdId = await Student.findOne({ email: new RegExp(`^${escapeRegExp(normalizedIdentifier)}$`, 'i') });
            }

            if (!getstdId) {
                return res.status(404).json({ Status: 'Fail', Error: 'Student not found' });
            }

            const newSpecialNeeds = new SpecialNeeds({
                regNo: getstdId._id,
                needs,
            });

            await newSpecialNeeds.save();

            return res.json({ Status: 'Success', Message: 'Special needs submitted successfully!' });
        } catch (err) {
            console.error('Error saving special needs:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    },

    studentAddEmergencyContact: async (req, res) => {
        try {
            const {
                regNo,
                firstName,
                surname,
                relationship,
                telNo,
                address,
                active
            } = req.body;

            if (!regNo) {
                return res.json({ message: 'User email (regNo) is required' });
            }

            // Check if emergency contact exists for this regNo
            const existingContact = await EmergencyContact.findOne({ regNo });

            if (existingContact) {
                // Update existing contact
                existingContact.firstName = firstName;
                existingContact.surname = surname;
                existingContact.relationship = relationship;
                existingContact.telNo = telNo;
                existingContact.address = address;
                existingContact.active = active;

                await existingContact.save();

                return res.json({
                    Status: "Success",
                    Message: 'Emergency contact updated successfully',
                });
            } else {
                // Create a new EmergencyContact document if not found
                const newContact = new EmergencyContact({
                    regNo,
                    firstName,
                    surname,
                    relationship,
                    telNo,
                    address,
                    active
                });

                await newContact.save();

                return res.json({
                    Status: "Success",
                    Message: 'Emergency contact saved successfully',
                });
            }

        } catch (err) {
            console.error('Error saving emergency contact:', err);
            return res.json({ message: 'Internal server error' });
        }
    },

    getEmergencyContact: async (req, res) => {
        try {
            const { regNo } = req.query;
            if (!regNo) {
                return res.json({ Error: 'regNo query parameter is required' });
            }

            const emergencyContact = await EmergencyContact.findOne({ regNo, active: true }).lean();

            if (!emergencyContact) {
                return res.json({ Error: 'No emergency contact found' });
            }

            res.json({ Status: 'Success', emergencyContact });
        } catch (err) {
            console.error(err);
            res.json({ Error: 'Server error' });
        }
    },

    getNeedsStudents: async (req, res) => {
        try {
            const { email } = req.params;

            const emailsToTry = new Set();
            const normalizedParamEmail = normalizeEmail(email);
            if (normalizedParamEmail) {
                emailsToTry.add(normalizedParamEmail);
            }

            if (req.user?.id) {
                const tokenUser = await User.findById(req.user.id).select('email username');
                const normalizedTokenEmail = normalizeEmail(tokenUser?.email);
                if (normalizedTokenEmail) {
                    emailsToTry.add(normalizedTokenEmail);
                }
                // For students, username IS the enrolmentNo — add it as a candidate
                if (tokenUser?.username) {
                    emailsToTry.add(tokenUser.username.trim());
                }
            }

            if (emailsToTry.size === 0) {
                return res.status(400).json({ Status: 'Fail', Error: 'Student identifier is required' });
            }

            let stdID = null;
            for (const candidateIdentifier of emailsToTry) {
                // Treat route param as enrolmentNo first. Fall back to email.
                stdID = await Student.findOne({ enrolmentNo: candidateIdentifier });
                if (!stdID) {
                    stdID = await Student.findOne({ enrolmentNo: new RegExp(`^${escapeRegExp(candidateIdentifier)}$`, 'i') });
                }
                if (!stdID) {
                    stdID = await Student.findOne({ email: candidateIdentifier });
                }
                if (!stdID) {
                    stdID = await Student.findOne({ email: new RegExp(`^${escapeRegExp(candidateIdentifier)}$`, 'i') });
                }
                if (stdID) break;
            }

            if (!stdID) {
                return res.status(404).json({ Status: 'Fail', Error: 'Student not found' });
            }

            const specialNeeds = await SpecialNeeds.find({ regNo: stdID._id });
            return res.json({ Status: 'Success', Data: specialNeeds });
        } catch (err) {
            console.error('Error fetching special needs by email:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    }

};

// Delete student and linked user
StudentController.deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Delete related allocations, special needs, emergency contacts
        const Allocation = require('../model/Allocation');
        const SpecialNeeds = require('../model/SpecialNeeds');
        const EmergencyContact = require('../model/EmergencyContact');

        await Allocation.deleteMany({ studentId: student._id });
        await SpecialNeeds.deleteMany({ regNo: student._id });
        await EmergencyContact.deleteMany({ regNo: student._id });

        // Delete synthetic user if exists
        const user = await User.findOne({ username: student.enrolmentNo });
        if (user) {
            const Warden = require('../model/Warden');
            const Hostel = require('../model/Hostel');
            await Hostel.updateMany({ warden: user._id }, { $unset: { warden: "" } });
            await Warden.deleteMany({ userId: user._id });
            await User.findByIdAndDelete(user._id);
        }

        // Delete the student document
        await Student.findByIdAndDelete(student._id);

        return res.json({ Status: 'Success', Message: 'Student and related records removed' });
    } catch (err) {
        console.error('Error deleting student:', err);
        return res.status(500).json({ Error: 'Failed to delete student' });
    }
};

module.exports = StudentController;
