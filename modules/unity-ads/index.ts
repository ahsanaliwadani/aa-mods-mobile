import { requireNativeModule, EventEmitter } from "expo-modules-core";

type EventHandler = (...args: string[]) => void;

const nativeModule = requireNativeModule("UnityAds");
const emitter = new EventEmitter(nativeModule);

const subscriptionMap = new Map<
  string,
  Map<EventHandler, ReturnType<typeof emitter.addListener>>
>();

function getEventMap(event: string) {
  if (!subscriptionMap.has(event)) subscriptionMap.set(event, new Map());
  return subscriptionMap.get(event)!;
}

const UnityAdsShim = {
  init(gameId: string) {
    nativeModule.initialize(gameId, false);
  },

  isReady(placementId: string, callback: (ready: boolean) => void) {
    const ready: boolean = nativeModule.isReady(placementId);
    callback(ready);
  },

  show(placementId: string) {
    nativeModule.show(placementId);
  },

  addEventListener(event: string, handler: EventHandler) {
    const map = getEventMap(event);
    const sub = emitter.addListener(
      event,
      (data: Record<string, string>) => {
        if (event === "onFinish") {
          handler(data.placementId, data.result);
        } else if (event === "onError") {
          handler(data.error, data.message);
        } else {
          handler(data.placementId);
        }
      },
    );
    map.set(handler, sub);
  },

  removeEventListener(event: string, handler: EventHandler) {
    const sub = subscriptionMap.get(event)?.get(handler);
    if (sub) {
      sub.remove();
      subscriptionMap.get(event)?.delete(handler);
    }
  },
};

export default UnityAdsShim;
