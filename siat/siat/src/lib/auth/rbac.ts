export enum Role {
  VIEWER = 'VIEWER',
  INPUT = 'INPUT',
  QC = 'QC',
  ADMIN = 'ADMIN',
}

export const permissions = {
  VIEWER: { canRead: true, canCreate: false, canUpdate: false, canApprove: false, canManageMasterData: false, canEditAssetNotes: false },
  INPUT: { canRead: true, canCreate: true, canUpdate: true, canApprove: false, canManageMasterData: false, canEditAssetNotes: true },
  QC: { canRead: true, canCreate: false, canUpdate: false, canApprove: true, canManageMasterData: false, canEditAssetNotes: true },
  ADMIN: { canRead: true, canCreate: true, canUpdate: true, canApprove: true, canManageMasterData: true, canEditAssetNotes: true },
};