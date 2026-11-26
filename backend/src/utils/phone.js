const normalizeIndianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.length === 10 ? digits : digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : '';
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
};
module.exports = { normalizeIndianPhone };
