export const metadata = {
  title: 'Privacy Policy',
}

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <div className="flex min-h-screen flex-col justify-center py-6 sm:py-12">
        <div className="prose relative mx-auto py-3 dark:prose-invert sm:max-w-2xl">
          <h1>Privacy Policy</h1>
          <p>
            Our website, metro-memory.com (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;), respects your privacy and is committed to
            protecting it in accordance with this Privacy Policy.
          </p>
          <h2>Information We Collect</h2>
          <p>
            We collect limited personal data, such as your IP address and other
            non-identifiable information, for analytics and to improve the user
            experience.
          </p>
          <h2>Cookies</h2>
          <p>
            We do not display advertisements or use third-party advertising
            networks. The only cookies we rely on are those required for the
            basic operation of the site and the analytics described below.
          </p>
          <h2>Google Analytics</h2>
          <p>
            We use Google Analytics to collect information about how our website
            is used. Google Analytics uses cookies to collect non-identifiable
            information such as your IP address, device information, and other
            non-identifiable information.
          </p>

          <h2>Your Rights</h2>
          <p>
            You have the right to access, rectify, or erase any personal data we
            hold about you. To exercise these rights, please contact us at
            benjamin.tdm@gmail.com.
          </p>
          <p>
            If you have any questions or concerns about our Privacy Policy,
            please feel free to contact us at benjamin.tdm@gmail.com.
          </p>
        </div>
      </div>
    </>
  )
}

export default PrivacyPolicy
