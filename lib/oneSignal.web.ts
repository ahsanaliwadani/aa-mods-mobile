type InboxAddFn = (item: {
  title: string;
  body: string;
  type: "onesignal" | "download_start" | "download_done" | "download_error" | "update_available" | "new_app" | "installed_update" | "general";
  data?: Record<string, unknown>;
  imageUrl?: string;
}) => void;

export function setInboxCallback(_cb: InboxAddFn | null): void {}
export function initializeOneSignal(): void {}
export function loginUser(_externalId: string): void {}
export function logoutUser(): void {}
export function setUserEmail(_email: string): void {}
export function setUserTag(_key: string, _value: string): void {}
export function removeUserTag(_key: string): void {}
export function addInAppTrigger(_key: string, _value: string): void {}
export function removeInAppTrigger(_key: string): void {}
export function setExternalUserId(_id: string): void {}
