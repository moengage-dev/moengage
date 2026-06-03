// src/lib/storage-upload.ts
import { createClient } from "@supabase/supabase-js";

type UploadBufferParams = {
  path: string;
  buffer: Buffer | Uint8Array | ArrayBuffer;
  contentType: string;
  bucket?: string;
  upsert?: boolean;
};

type UploadJsonParams = {
  path: string;
  data: unknown;
  bucket?: string;
  upsert?: boolean;
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getDefaultBucket() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!bucket) {
    throw new Error("SUPABASE_STORAGE_BUCKET is required.");
  }

  return bucket;
}

export async function uploadBufferToStorage({
  path,
  buffer,
  contentType,
  bucket = getDefaultBucket(),
  upsert = false,
}: UploadBufferParams) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    bucket,
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
}

export async function uploadJsonToStorage({
  path,
  data,
  bucket = getDefaultBucket(),
  upsert = true,
}: UploadJsonParams) {
  const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2), "utf-8");

  return uploadBufferToStorage({
    path,
    buffer: jsonBuffer,
    contentType: "application/json",
    bucket,
    upsert,
  });
}

export function getPublicStorageUrl(path: string, bucket = getDefaultBucket()) {
  const supabase = getSupabaseAdminClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteStorageFile(
  path: string,
  bucket = getDefaultBucket(),
) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }

  return true;
}
