const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

export function ThemeScript() {
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `
                    (function() {
                        var path = window.location.pathname;
                        var isAuth = ${JSON.stringify(AUTH_ROUTES)}.some(function(r) { return path.startsWith(r); });
                        if (isAuth) return;
                        var theme = localStorage.getItem('theme');
                        if (theme === 'dark') {
                            document.documentElement.classList.add('dark');
                        } else if (theme === 'system' || !theme) {
                            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                document.documentElement.classList.add('dark');
                            } else {
                                document.documentElement.classList.remove('dark');
                            }
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    })();
                `,
            }}
        />
    )
}
