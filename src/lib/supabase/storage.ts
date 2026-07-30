import {createClient} from './client'

const AVATARS_BUCKET = 'avatars'

export function getAvatarPath(userId: string): string {
    return `${userId}/avatar`
}

export function getAvatarPublicUrl(userId: string): string {
    const supabase = createClient()
    const {data} = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(getAvatarPath(userId))
    return data.publicUrl
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
    const supabase = createClient()

    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    if (!ext || !allowedExtensions.includes(ext)) {
        throw new Error('invalid_file_type')
    }

    if (file.size > 50 * 1024 * 1024) {
        throw new Error('file_too_large')
    }

    const path = getAvatarPath(userId)

    const {error: removeError} = await supabase.storage
        .from(AVATARS_BUCKET)
        .remove([path])
    if (removeError && !removeError.message?.includes('not found')) {
        console.error('Error removing old avatar:', removeError)
    }

    const {error: uploadError} = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, {
            upsert: true,
            contentType: file.type,
        })

    if (uploadError) {
        throw new Error('upload_failed')
    }

    const publicUrl = getAvatarPublicUrl(userId)
    return `${publicUrl}?t=${Date.now()}`
}

export async function deleteAvatar(userId: string): Promise<void> {
    const supabase = createClient()
    const path = getAvatarPath(userId)

    const {error} = await supabase.storage
        .from(AVATARS_BUCKET)
        .remove([path])

    if (error && !error.message?.includes('not found')) {
        console.error('Error deleting avatar:', error)
    }
}
