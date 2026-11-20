module.exports = {
  sessionMsgCache: new Map(),
  sleepingUsers: new Set(),
  cafeAudioPlayer: null,
  pendingOrders: new Map(),
  kickedOrderReasons: new Map(),
  pendingUnmuteUsers: new Set()
};