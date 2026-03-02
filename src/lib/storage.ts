import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'wardrobe-images';

/**
 * Upload an image to Supabase storage and return the public URL.
 * Files are stored under the user's ID folder for isolation.
 */
export async function uploadImage(
    supabase: SupabaseClient,
    file: File,
    userId: string,
    folder: 'avatars' | 'wardrobe'
): Promise<{ url: string | null; error: string | null }> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { url: null, error: 'File must be an image' };
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { url: null, error: 'Image must be less than 5MB' };
        }

        // Create a unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { url: null, error: uploadError.message };
        }

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return { url: publicUrl, error: null };
    } catch (err) {
        console.error('Upload error:', err);
        return { url: null, error: 'Failed to upload image' };
    }
}

/**
 * Delete an image from Supabase storage by its public URL.
 */
export async function deleteImage(
    supabase: SupabaseClient,
    publicUrl: string
): Promise<{ error: string | null }> {
    try {
        // Extract the path from the public URL
        const urlParts = publicUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
        if (urlParts.length < 2) {
            return { error: 'Invalid image URL' };
        }

        const filePath = urlParts[1];
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

        if (error) {
            return { error: error.message };
        }

        return { error: null };
    } catch (err) {
        console.error('Delete error:', err);
        return { error: 'Failed to delete image' };
    }
}
