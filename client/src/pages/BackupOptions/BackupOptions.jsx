import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import DefaultInput from '../../components/Form/DefaultInput';
import Dropdown from '../../components/Form/Dropdown';
import FileInput from '../../components/Form/FileInput';

const BackupOptions = () => {
    const token = localStorage.getItem('login');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [effectiveBackupDir, setEffectiveBackupDir] = useState('');

    const [importFile, setImportFile] = useState(null);
    const [importMode, setImportMode] = useState('json');
    const [importCollection, setImportCollection] = useState('students');

    const [formData, setFormData] = useState({
        enabled: false,
        frequency: 'daily',
        time: '02:00',
        dayOfWeek: 0,
        backupDir: '',
    });

    const frequencyOptions = useMemo(() => ([
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
    ]), []);

    const dayOfWeekOptions = useMemo(() => ([
        { value: '0', label: 'Sunday' },
        { value: '1', label: 'Monday' },
        { value: '2', label: 'Tuesday' },
        { value: '3', label: 'Wednesday' },
        { value: '4', label: 'Thursday' },
        { value: '5', label: 'Friday' },
        { value: '6', label: 'Saturday' },
    ]), []);

    const collectionOptions = useMemo(() => ([
        { value: 'students', label: 'Students' },
        { value: 'allocations', label: 'Allocations' },
        { value: 'hostels', label: 'Hostels' },
        { value: 'rooms', label: 'Rooms' },
        { value: 'specialNeeds', label: 'Special Needs' },
        { value: 'emergencyContacts', label: 'Emergency Contacts' },
        { value: 'users', label: 'Users' },
        { value: 'userOTPs', label: 'User OTPs' },
        { value: 'wardens', label: 'Wardens' },
        { value: 'damages', label: 'Damages' },
        { value: 'eligibility', label: 'Eligibility' },
        { value: 'studentInfo', label: 'Student Info' },
        { value: 'studentLastUpdate', label: 'Student Last Update' },
        { value: 'roles', label: 'Roles' },
        { value: 'payments', label: 'Payments' },
        { value: 'backupSettings', label: 'Backup Settings' },
    ]), []);

    const loadSettings = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/admin/backup-settings`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = res.data || {};

            setFormData({
                enabled: !!data.enabled,
                frequency: data.frequency === 'weekly' ? 'weekly' : 'daily',
                time: typeof data.time === 'string' ? data.time : '02:00',
                dayOfWeek: Number.isInteger(data.dayOfWeek) ? data.dayOfWeek : 0,
                backupDir: typeof data.backupDir === 'string' ? data.backupDir : '',
            });

            setEffectiveBackupDir(typeof data.effectiveBackupDir === 'string' ? data.effectiveBackupDir : '');
        } catch (err) {
            console.log(err);
            const msg = err?.response?.data?.message || err?.response?.data?.Error || 'Failed to load backup settings.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'dayOfWeek' ? Number(value) : value),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                enabled: formData.enabled,
                frequency: formData.frequency,
                time: formData.time,
                dayOfWeek: formData.dayOfWeek,
                backupDir: formData.backupDir,
            };

            const res = await axios.put(`${import.meta.env.VITE_APP_API}/admin/backup-settings`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const settings = res.data?.settings;
            if (settings) {
                setFormData({
                    enabled: !!settings.enabled,
                    frequency: settings.frequency === 'weekly' ? 'weekly' : 'daily',
                    time: typeof settings.time === 'string' ? settings.time : '02:00',
                    dayOfWeek: Number.isInteger(settings.dayOfWeek) ? settings.dayOfWeek : 0,
                    backupDir: typeof settings.backupDir === 'string' ? settings.backupDir : '',
                });
                setEffectiveBackupDir(typeof settings.effectiveBackupDir === 'string' ? settings.effectiveBackupDir : '');
            }

            alert(res.data?.message || 'Backup settings updated.');
        } catch (err) {
            console.log(err);
            const msg = err?.response?.data?.message || err?.response?.data?.Error || 'Failed to update backup settings.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadDatabase = async () => {
        setDownloading(true);
        setError('');

        try {
            const response = await axios.get(`${import.meta.env.VITE_APP_API}/admin/download-database`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                responseType: 'blob',
            });

            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `database_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.zip`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            alert('Database backup downloaded successfully!');
        } catch (err) {
            console.log(err);
            const msg = err?.response?.data?.message || err?.response?.data?.Error || 'Failed to download database backup.';
            setError(msg);
        } finally {
            setDownloading(false);
        }
    };

    const handleImportFileChange = (e) => {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setImportFile(file);
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'zip') {
            setImportMode('zip');
        } else if (ext === 'json') {
            setImportMode('json');
        }
    };

    const handleRestoreBackup = async (e) => {
        e.preventDefault();
        setError('');

        if (!importFile) {
            setError('Please choose a JSON or ZIP file to import.');
            return;
        }

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            if (importMode === 'json') {
                formData.append('collection', importCollection);
            }

            const res = await axios.post(`${import.meta.env.VITE_APP_API}/admin/restore-backup`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            alert(res.data?.message || 'Backup import completed.');
            setImportFile(null);
        } catch (err) {
            console.log(err);
            const msg = err?.response?.data?.message || err?.response?.data?.Error || 'Failed to import backup file.';
            setError(msg);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-[#6b0f14] mb-8">Backup Options</h1>

            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-10">
                {loading ? (
                    <div className="text-gray-600">Loading...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                            <input
                                type="checkbox"
                                name="enabled"
                                checked={formData.enabled}
                                onChange={handleInputChange}
                                className="h-4 w-4 rounded border-gray-300 text-[#6b0f14] focus:ring-2 focus:ring-[#6b0f14]/30 transition"
                            />
                            <label className="font-medium text-gray-700">Enable automatic backups</label>
                        </div>

                        <Dropdown
                            label="Frequency"
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleInputChange}
                            required
                            options={frequencyOptions}
                        />

                        <DefaultInput
                            label="Time (server local time)"
                            type="time"
                            name="time"
                            value={formData.time}
                            onChange={handleInputChange}
                            required
                        />

                        {formData.frequency === 'weekly' && (
                            <Dropdown
                                label="Day of week"
                                name="dayOfWeek"
                                value={String(formData.dayOfWeek)}
                                onChange={handleInputChange}
                                required
                                options={dayOfWeekOptions}
                            />
                        )}

                        <DefaultInput
                            label="Backup directory (optional)"
                            type="text"
                            name="backupDir"
                            value={formData.backupDir}
                            onChange={handleInputChange}
                            placeholder="Leave empty to use the server default"
                        />

                        {effectiveBackupDir && (
                            <div className="-mt-4 mb-2 text-xs text-gray-500">
                                Effective path: <span className="font-mono text-[#6b0f14]">{effectiveBackupDir}</span>
                            </div>
                        )}

                        <div className="-mt-2">
                            <DefaultBtn
                                type="submit"
                                label={saving ? 'Saving...' : 'Save Backup Options'}
                                disabled={saving}
                            />
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Database Backup</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Click below to download a ZIP file containing separate JSON files for each database collection.
                            </p>
                            <DefaultBtn
                                type="button"
                                label={downloading ? 'Downloading...' : 'Download Full Database'}
                                disabled={downloading}
                                onClick={handleDownloadDatabase}
                            />
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Restore Backup</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Import a JSON file for a single collection, or upload a ZIP to restore multiple collections at once.
                            </p>

                            <FileInput
                                label="Backup file (.json or .zip)"
                                name="backupFile"
                                accept=".json,.zip"
                                onChange={handleImportFileChange}
                            />

                            {importMode === 'json' && (
                                <Dropdown
                                    label="Target collection"
                                    name="importCollection"
                                    value={importCollection}
                                    onChange={(e) => setImportCollection(e.target.value)}
                                    options={collectionOptions}
                                />
                            )}

                            {importMode === 'zip' && (
                                <div className="-mt-2 mb-4 text-xs text-gray-500">
                                    ZIP import will restore all matching JSON files inside the archive.
                                </div>
                            )}

                            <DefaultBtn
                                type="button"
                                label={importing ? 'Importing...' : 'Import Backup'}
                                disabled={importing}
                                onClick={handleRestoreBackup}
                            />
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BackupOptions;
