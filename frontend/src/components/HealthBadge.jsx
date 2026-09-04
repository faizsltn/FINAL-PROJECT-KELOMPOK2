const STATUS_CONFIG = {
  checking: { label: 'Mengecek...', classes: 'bg-gray-100 text-gray-600 border-gray-300' },
  ok: { label: 'Backend Aktif', classes: 'bg-green-100 text-green-700 border-green-300' },
  error: { label: 'Backend Gak Kedetek', classes: 'bg-red-100 text-red-700 border-red-300' },
};

/**
 * Komponen berbasis data: tampilannya 100% ditentukan dari prop `status`,
 * gak ada logic khusus per pemanggilan.
 */
function HealthBadge({ status }) {
  const { label, classes } = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  return (
    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${classes}`}>
      {label}
    </span>
  );
}

export default HealthBadge;
