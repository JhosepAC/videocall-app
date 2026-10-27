'use client'

import {useState, type ComponentProps} from 'react'
import {Check, CircleAlert, Eye, EyeOff, Lock} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {useI18n} from '@/components/i18n/i18n-provider'

export const PASSWORD_RULES = [
    {label: 'password_rules.min_chars', test: (p: string) => p.length > 6},
    {label: 'password_rules.uppercase', test: (p: string) => /[A-Z]/.test(p)},
    {label: 'password_rules.number', test: (p: string) => /[0-9]/.test(p)},
    {label: 'password_rules.special', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(p)},
]

export function PasswordField(props: Omit<ComponentProps<'input'>, 'type'>) {
    const {t} = useI18n()
    const [visible, setVisible] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    return <>
        <div className="auth-input-wrap">
            <Lock className="auth-input-icon" size={17} aria-hidden="true"/>
            <Input {...props} type={visible ? 'text' : 'password'} className="auth-input auth-password"
                onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyDown={e => setCapsLock(e.getModifierState('CapsLock'))}
                onBlur={e => {setCapsLock(false); props.onBlur?.(e)}}/>
            <button type="button" className="password-toggle" disabled={props.disabled}
                aria-label={t(visible ? 'auth.experience.hide_password' : 'auth.experience.show_password')}
                aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(!visible)}>
                {visible ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
        </div>
        {capsLock && <p className="auth-hint" role="status">{t('auth.experience.caps_lock')}</p>}
    </>
}

export function FieldError({id, message}: {id: string; message?: string | null}) {
    const {t} = useI18n()
    return message ? <p id={id} className="auth-field-error" role="alert"><CircleAlert size={14} aria-hidden="true"/>{t(message)}</p> : null
}

export function PasswordRequirements({password}: {password: string}) {
    const {t} = useI18n()
    return <ul id="password-requirements" className="password-requirements">
        {PASSWORD_RULES.map(rule => <li key={rule.label} data-valid={rule.test(password)}>
            <span className="password-rule-mark" aria-hidden="true">{rule.test(password) ? <Check size={11} strokeWidth={3}/> : <span/>}</span>
            <span>{t(rule.label)}{rule.test(password) && <span className="sr-only"> — {t('auth.experience.rule_met')}</span>}</span>
        </li>)}
    </ul>
}
