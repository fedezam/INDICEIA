/**
 * Marcar un build como exitoso
 */
export async function markBuildAsSuccess(build_id, extra = {}) {
  try {
    const payload = {
      status: 'success',
      finished_at: Timestamp.now(),
      ...extra
    };

    await updateManifest(build_id, payload);
    Logger.info(`✅ Build marked as SUCCESS: ${build_id}`);
    return true;

  } catch (error) {
    Logger.error(`Error marking build ${build_id} as success:`, error);
    throw error;
  }
}

/**
 * Marcar un build como fallido
 */
export async function markBuildAsFailed(build_id, error) {
  try {
    const payload = {
      status: 'failed',
      finished_at: Timestamp.now(),
      error_message: error?.message || 'Unknown error',
      error_stack: error?.stack || null
    };

    await updateManifest(build_id, payload);
    Logger.warn(`❌ Build marked as FAILED: ${build_id}`);
    return true;

  } catch (err) {
    Logger.error(`Error marking build ${build_id} as failed:`, err);
    throw err;
  }
}
