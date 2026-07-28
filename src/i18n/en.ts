export const en = {
  common: {
    loading: 'Loading...',
    save: 'Save Changes',
    saving: 'Saving...',
    cancel: 'Cancel',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied!',
    back: 'Back',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',
    new_password: 'New Password',
    current_password: 'Current Password',
    confirm_new_password: 'Confirm New Password',
    full_name: 'Full Name',
    username: 'Username',
    avatar_url: 'Avatar URL',
    placeholder_email: 'email@example.com',
    placeholder_password: '••••••••',
    placeholder_name: 'e.g. John Doe',
    placeholder_username: 'johndoe_dev',
    placeholder_avatar: 'https://example.com/avatar.jpg',
    placeholder_room_code: 'e.g. abc-123-xyz',
    sign_in: 'Sign In',
    sign_out: 'Sign Out',
    create_account: 'Create Account',
    signing_in: 'Signing in...',
    creating_account: 'Creating account...',
  },

  nav: {
    brand: 'MeetMesh',
    dashboard: 'Dashboard',
    settings: 'Settings',
    back_to_dashboard: 'Back to dashboard',
  },

  landing: {
    title: 'Video Conferencing',
    subtitle: 'Private, Secure, and Free',
    description: 'Connect directly with anyone you want. No intermediaries, no time limits, and total privacy.',
    login: 'Sign In',
    create_account: 'Create Free Account',
  },

  auth: {
    layout_title: 'Access | P2P Platform',
    layout_description: 'Sign in or register to access secure, high-quality peer-to-peer video conferences.',

    login: {
      heading: 'Welcome back',
      subtitle: 'Enter your credentials to continue',
      email_label: 'Email',
      email_placeholder: 'email@example.com',
      password_label: 'Password',
      password_placeholder: '••••••••',
      forgot_password: 'Forgot your password?',
      signing_in: 'Signing in...',
      sign_in: 'Sign In',
      no_account: "Don't have an account?",
      register_link: 'Register here',
    },

    register: {
      heading: 'Create Account',
      subtitle: 'Enter your credentials to create an account',
      email_label: 'Email',
      email_placeholder: 'email@example.com',
      password_label: 'Password',
      password_placeholder: '••••••••',
      confirm_password_label: 'Confirm Password',
      creating_account: 'Creating account...',
      create_account: 'Create Account',
      has_account: 'Already have an account?',
      login_link: 'Sign in here',
    },

    forgot_password: {
      heading: 'Forgot your password?',
      subtitle: 'We will send you a link to reset it',
      success: 'Check your email. The link expires in 15 minutes.',
      email_label: 'Email',
      email_placeholder: 'email@example.com',
      send_link: 'Send Link',
      back_to_login: 'Back to sign in',
    },

    reset_password: {
      loading: 'Verifying link...',
      invalid_heading: 'Invalid or expired link',
      invalid_message: 'The recovery link is no longer valid. Request a new one.',
      request_new: 'Request new link',
      success_heading: 'Password updated',
      success_message: 'Your password has been reset successfully.',
      sign_in: 'Sign In',
      form_heading: 'New password',
      form_subtitle: 'Enter your new password',
      new_password_label: 'New Password',
      confirm_password_label: 'Confirm Password',
      update: 'Update Password',
      error_min_length: 'Password must be at least 6 characters',
      error_mismatch: 'Passwords do not match',
    },

    verify_email: {
      heading: 'Check your email',
      message: 'We have sent a confirmation link to',
      your_email: 'your email',
      open_gmail: 'Open Gmail',
      hint: "Can't find the email? Check your spam folder or wait a few minutes.",
      back_to_login: 'Back to sign in',
    },

    complete_profile: {
      heading: 'Complete your profile',
      subtitle: 'Set up your identity for video conference rooms',
      full_name_label: 'Full Name',
      full_name_placeholder: 'e.g. John Doe',
      username_label: 'Username',
      username_placeholder: 'johndoe_dev',
      avatar_url_label: 'Avatar URL',
      avatar_url_placeholder: 'https://example.com/avatar.jpg',
      saving: 'Saving...',
      go_to_dashboard: 'Go to Dashboard',
      loading: 'Loading...',
    },
  },

  dashboard: {
    title: 'Dashboard | Video Conference Platform',
    description: 'Manage your high-quality P2P meeting rooms.',
    greeting: 'Hello,',
    subtitle: "What would you like to do today?",
    new_meeting: 'New meeting',
    new_meeting_desc: 'Start a room instantly and share the invitation link with other participants.',
    start_now: 'Start now',
    join_code: 'Join with code',
    join_code_desc: 'Enter the room code or the meeting link you were invited to.',
    join: 'Join',
    footer: 'All rights reserved.',
    developed_by: 'Developed by',
  },

  settings: {
    title: 'Settings | MeetMesh',
    heading: 'Settings',
    subtitle: 'Manage your account and preferences',

    tabs: {
      account: 'Account',
      profile: 'Profile',
      preferences: 'Preferences',
      security: 'Security',
    },

    account: {
      email_title: 'Email',
      email_desc: 'This is the email associated with your account. It cannot be changed.',
      copy_email: 'Copy email',
      sign_out_title: 'Sign Out',
      sign_out_desc: 'Leave your account on this device.',
      sign_out: 'Sign Out',
    },

    profile: {
      full_name_label: 'Full Name',
      full_name_placeholder: 'e.g. John Doe',
      username_label: 'Username',
      username_placeholder: 'johndoe_dev',
      avatar_url_label: 'Avatar URL',
      avatar_url_placeholder: 'https://example.com/avatar.jpg',
      success: 'Profile updated successfully',
      save: 'Save Changes',
    },

    preferences: {
      theme_title: 'Theme',
      theme_desc: 'Customize the appearance of the application.',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      language_title: 'Language',
      language_desc: 'Select the interface language.',
      spanish: 'Spanish',
      english: 'English',
    },

    security: {
      title: 'Change password',
      desc: 'Update your password periodically to keep your account secure.',
      current_password_label: 'Current Password',
      new_password_label: 'New Password',
      confirm_new_password_label: 'Confirm New Password',
      success: 'Password updated successfully',
      update: 'Update Password',
    },
  },

  password_rules: {
    min_chars: 'More than 6 characters',
    uppercase: 'At least one uppercase letter',
    number: 'At least one number',
    special: 'At least one special character',
  },

  room: {
    title: 'Meeting Room | MeetMesh',
    description: 'Secure P2P video conference. Direct real-time communication.',
    loading_devices: 'Starting devices...',
    hardware_error: 'Hardware Error',
    participant: 'Participant',
    participants: 'Participants',
    room_header: 'Meeting Room',
    room_id: 'ID:',
    leave: 'Leave',
    you: 'You',
    you_local: 'You (Local)',
    share_url: 'Share Room (URL)',
    copied: 'COPIED!',
    stream_simulated: 'Simulated stream',
    sharing_screen: 'Sharing screen',
    sharing: 'Sharing',
    hide_people: 'Hide people',
    show_people: 'Show people',
    raise_hand: 'Raise Hand',
    lower_hand: 'Lower Hand',
    enhance_toggle: 'Toggle video enhancement',
    enhance_title: 'Enhance',
    enhance_wb: 'White Balance',
    enhance_awb_auto: 'Auto White Balance',
    enhance_gamma: 'Gamma',
    enhance_brightness: 'Brightness',
    enhance_contrast: 'Contrast',
    enhance_saturation: 'Saturation',
    enhance_sharpness: 'Sharpness',
    enhance_denoise: 'Denoise',
    enhance_reset: 'Reset to defaults',
    react: 'React',
    reactions: 'Reactions',
  },

  media_errors: {
    denied: 'Permission denied. Please allow access to your camera and microphone.',
    not_found: 'No camera or microphone found connected.',
    in_use: 'Your camera or microphone is already being used by another application.',
    generic: 'Error accessing media devices.',
    unknown: 'Unknown error initializing hardware.',
  },

  errors: {
    not_authenticated: 'You must be signed in to perform this action.',
    empty_full_name: 'Full name is required.',
    empty_username: 'Username is required.',
    empty_avatar_url: 'Avatar URL is required.',
    empty_email: 'Email is required.',
    invalid_email: 'Please enter a valid email address.',
    empty_password: 'Password is required.',
    weak_password: 'Password does not meet minimum requirements.',
    passwords_dont_match: 'Passwords do not match.',
    email_already_registered: 'This email is already registered. Try signing in.',
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'You must confirm your email before signing in. Check your inbox.',
    rate_limited: 'Too many attempts. Try again in a few minutes.',
    server_error: 'Server error. Try again later.',
    current_password_required: 'Current password is required.',
    current_password_wrong: 'Current password is incorrect.',
    new_password_min: 'New password must be more than 6 characters.',
    new_password_uppercase: 'New password must have at least one uppercase letter.',
    new_password_number: 'New password must have at least one number.',
    new_password_special: 'New password must have at least one special character.',
  },
}

export type Translations = {
  common: Record<string, string>
  nav: Record<string, string>
  landing: Record<string, string>
  auth: {
    layout_title: string
    layout_description: string
    login: Record<string, string>
    register: Record<string, string>
    forgot_password: Record<string, string>
    reset_password: Record<string, string>
    verify_email: Record<string, string>
    complete_profile: Record<string, string>
  }
  dashboard: Record<string, string>
  settings: {
    title: string
    heading: string
    subtitle: string
    tabs: Record<string, string>
    account: Record<string, string>
    profile: Record<string, string>
    preferences: Record<string, string>
    security: Record<string, string>
  }
  password_rules: Record<string, string>
  room: Record<string, string>
  media_errors: Record<string, string>
  errors: Record<string, string>
}
