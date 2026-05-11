export const canLocalNotify = false;
export async function notifyDownloadStarted(_appName: string): Promise<void> {}
export async function notifyDownloadFinished(_appName: string): Promise<void> {}
export async function notifyDownloadFailed(_appName: string, _error?: string): Promise<void> {}
export async function notifyUpdateAvailable(_count: number, _firstAppName?: string): Promise<void> {}
export async function notifyNewApp(_appName: string, _category: string): Promise<void> {}
export async function notifyInstalledAppsUpdated(_appNames: string[], _count: number): Promise<void> {}
