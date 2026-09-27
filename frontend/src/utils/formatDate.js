// Ημερομηνία κριτικής, π.χ. "11 Αυγ 2026".
export function formatReviewDate(instantString) {
    return new Date(instantString).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}