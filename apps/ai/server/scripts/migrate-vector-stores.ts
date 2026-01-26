import { Thread } from '../models/thread';
import { VectorStore, VectorStoreScope } from '../models/vector-store';
import mongoose from 'mongoose';
import logger from '../services/logger';

/**
 * Migration script to move vector store external IDs from threads to the new vector store model
 * This should be run once when deploying the new vector store feature
 */
export async function migrateVectorStores() {
  try {
    logger.info('Starting vector store migration...');

    // Find all threads that have vectorStoreExternalId (using raw query to bypass TypeScript)
    const threadsWithVectorStore = await Thread.find({ 
      vectorStoreExternalId: { $exists: true, $ne: null } 
    }).populate('integration').populate('user').populate('workspace').lean();

    logger.info(`Found ${threadsWithVectorStore.length} threads with vector stores to migrate`);

    for (const thread of threadsWithVectorStore) {
      try {
        // Check if vector store already exists for this thread
        const existingVectorStore = await VectorStore.findOne({
          tenant: (thread.integration as any).tenant,
          agent: new mongoose.Types.ObjectId(thread.integration),
          scope: 'thread',
          subjectId: thread._id.toString()
        });

        if (!existingVectorStore) {
          // Create new vector store record
          const vectorStore = new VectorStore({
            scope: 'thread' as VectorStoreScope,
            subjectId: thread._id.toString(),
            tenant: (thread.integration as any).tenant,
            agent: new mongoose.Types.ObjectId(thread.integration),
            externalId: (thread as any).vectorStoreExternalId,
            expirationAfterDays: 30, // Default expiration
            hardcodedIds: []
          });

          await vectorStore.save();
          logger.info(`Migrated vector store ${(thread as any).vectorStoreExternalId} for thread ${thread._id}`);
        } else {
          logger.info(`Vector store already exists for thread ${thread._id}, skipping`);
        }
      } catch (error) {
        logger.error(`Error migrating thread ${thread._id}:`, error);
      }
    }

    // After migration, optionally remove the vectorStoreExternalId field from threads
    // Uncomment the following lines if you want to clean up the old field
    /*
    await Thread.updateMany(
      { vectorStoreExternalId: { $exists: true } },
      { $unset: { vectorStoreExternalId: 1 } }
    );
    logger.info('Cleaned up vectorStoreExternalId field from threads');
    */

    logger.info('Vector store migration completed');
  } catch (error) {
    logger.error('Vector store migration failed:', error);
    throw error;
  }
}
