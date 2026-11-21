export const SRI_LANKA_DISTRICTS = {
    '1': 'Colombo',
    '2': 'Gampaha',
    '3': 'Kalutara',
    '4': 'Kandy',
    '5': 'Matale',
    '6': 'Nuwara Eliya',
    '7': 'Galle',
    '8': 'Matara',
    '9': 'Hambantota',
    '10': 'Jaffna',
    '11': 'Kilinochchi',
    '12': 'Mannar',
    '13': 'Vavuniya',
    '14': 'Mullaitivu',
    '15': 'Batticaloa',
    '16': 'Ampara',
    '17': 'Trincomalee',
    '18': 'Kurunegala',
    '19': 'Puttalam',
    '20': 'Anuradhapura',
    '21': 'Polonnaruwa',
    '22': 'Badulla',
    '23': 'Monaragala',
    '24': 'Ratnapura',
    '25': 'Kegalle'
};

export const formatDistrict = (dist) => {
    if (!dist) return '';
    const trimmed = String(dist).trim();
    return SRI_LANKA_DISTRICTS[trimmed] || trimmed;
};

export const formatDistrictWithCode = (dist) => {
    if (!dist) return '—';
    const trimmed = String(dist).trim();
    if (SRI_LANKA_DISTRICTS[trimmed]) {
        return `${SRI_LANKA_DISTRICTS[trimmed]} (${trimmed})`;
    }
    return trimmed;
};

export const getStudentHomeTown = (student) => {
    if (!student) return '—';

    const clean = (val) => (val ? String(val).trim() : '');
    const stripTrailing = (val) => val.replace(/^[,\s]+|[.,\s]+$/g, '');
    const hasLetters = (val) => /[a-zA-Z]/.test(val);

    const a3 = clean(student.address3);
    const a2 = clean(student.address2);
    const a1 = clean(student.address1);
    const distRaw = clean(student.alDistrict);
    const distName = formatDistrict(distRaw);

    // 1. If address3 has letters (e.g. "MANIPAY.", "BELIATTA.", "COLOMBO 07.")
    if (a3 && hasLetters(a3)) {
        return stripTrailing(a3);
    }

    // 2. If address3 is missing or purely numeric (e.g. postal code "10" or "80000"),
    // check if address2 has letters (e.g. "PANDATERUPPU.", "MALLAKAM.")
    if (a2 && hasLetters(a2)) {
        if (a3 && /^\d+$/.test(a3)) {
            return `${stripTrailing(a2)} ${a3}`;
        }
        return stripTrailing(a2);
    }

    // 3. If address3 was numeric and we have a valid district name
    if (a3 && /^\d+$/.test(a3) && distName) {
        return `${distName} ${a3}`;
    }

    // 4. Fall back to resolved district name (e.g. '10' -> 'Jaffna', '7' -> 'Galle')
    if (distName) {
        return distName;
    }

    // 5. If address1 has letters and isn't just a street number / lot number
    if (a1 && hasLetters(a1) && !/^no[.\s]*\d+/i.test(a1)) {
        return stripTrailing(a1);
    }

    // 6. Extract from fullAddress
    if (student.fullAddress && hasLetters(student.fullAddress)) {
        const parts = student.fullAddress.split(',').map(p => stripTrailing(p)).filter(p => hasLetters(p));
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
        return stripTrailing(student.fullAddress);
    }

    return a3 || a2 || distRaw || '—';
};

