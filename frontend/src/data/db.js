import Dexie from 'dexie';

export const db = new Dexie('MovieDatabase');

// Define database schema
// We index fields that we frequently filter or search by
db.version(1).stores({
  movies: '++id, title, year, genre, type, label, addedAt',
  upcoming: '++id, title, releaseDate',
  meta: 'key, value' // For tracking sync status
});

/**
 * Synchronizes the IndexedDB with the provided JSON data.
 * Only identifies and adds new items to avoid unnecessary writes.
 */
export const syncDatabase = async (botData, upcomingData) => {
  try {
    // 1. Sync Movies
    const existingCount = await db.movies.count();
    
    // Simple heuristic: if counts differ or DB is empty, perform a sync
    // In a more complex app, we'd use a version/hash check
    if (existingCount !== botData.length) {
      console.log('🔄 Syncing Movies to IndexedDB...');
      await db.movies.clear();
      await db.movies.bulkAdd(botData);
      console.log('✅ Movies Sync Complete');
    }

    // 2. Sync Upcoming
    const existingUpcomingCount = await db.upcoming.count();
    if (existingUpcomingCount !== upcomingData.length) {
      console.log('🔄 Syncing Upcoming Movies...');
      await db.upcoming.clear();
      await db.upcoming.bulkAdd(upcomingData);
      console.log('✅ Upcoming Sync Complete');
    }

    await db.meta.put({ key: 'lastSync', value: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Database Sync Error:', error);
  }
};
