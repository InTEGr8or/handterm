import { createLogger, LogLevel } from './utils/Logger';

const logger = createLogger({
  prefix: 'TerminalData',
  level: LogLevel.DEBUG
});

function openDatabase() {
  const request = indexedDB.open('HandTermDatabase', 1);

  request.onupgradeneeded = function(_event: IDBVersionChangeEvent) {
    const db = request.result;
    if (!db.objectStoreNames.contains('terminalData')) {
      db.createObjectStore('terminalData', { keyPath: 'id' });
    }
  };

  request.onsuccess = function(_event: Event) {
    const db = request.result;
    const transaction = db.transaction(['terminalData'], 'readwrite');
    const store = transaction.objectStore('terminalData');

    const result = store.get('someKey');
    result.onsuccess = function() {
      logger.debug('Retrieved data:', result.result);
    };
  };

  const openDb = request;
  openDb.onerror = function(event: Event) {
    const target = event.target as IDBOpenDBRequest | null;
    if (target && 'error' in target) {
      logger.error('IndexedDB error:', (target as IDBOpenDBRequest).error);
    } else {
      logger.error('Unknown IndexedDB error occurred');
    }
  };

  return openDb;
}

export { openDatabase };
