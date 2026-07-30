export const EMOJI_LIST = [
    {emoji: '😂', file: 'XD.webp', label: 'Laughing'},
    {emoji: '😮', file: 'wow.webp', label: 'Surprise'},
    {emoji: '🎉', file: 'yiupi.webp', label: 'Celebration'},
    {emoji: '🤔', file: 'think.webp', label: 'Thinking'},
    {emoji: '😢', file: 'pupi.webp', label: 'Sad'},
]

export function getEmojiUrl(emoji: string): string {
    const entry = EMOJI_LIST.find(e => e.emoji === emoji)
    if (!entry) return ''
    return `/emojis/${entry.file}`
}
