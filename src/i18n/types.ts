export type Locale = 'en' | 'es'

export type NestedTranslations = {
    [key: string]: string | NestedTranslations
}
