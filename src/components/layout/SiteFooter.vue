<script setup lang="ts">
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'

const termsOpen = ref(false)
const version = __APP_VERSION__
const year = computed(() => new Date().getFullYear())
</script>

<template>
  <footer class="d-footer">
    <div class="d-footer-inner">
      <div class="d-footer-left">
        <span>&copy; {{ year }} Corwynn Technology LLC</span>
        <span class="sep" aria-hidden="true">&middot;</span>
        <span class="version">v{{ version }}</span>
      </div>
      <div class="d-footer-right">
        <button
          type="button"
          class="d-footer-link"
          @click="termsOpen = true"
        >
          Terms of Service
        </button>
      </div>
    </div>

    <Dialog
      v-model:visible="termsOpen"
      header="Terms of Service"
      modal
      :style="{ width: '760px', maxWidth: '92vw' }"
      :pt="{ content: { class: 'tos-dialog-content' } }"
    >
      <div class="tos-content">
        <h3>Introduction</h3>
        <p>
          This web site is owned and operated by Corwynn Technology LLC
          (&quot;Corwynn Technology&quot;), an Arizona limited liability company.
          Corwynn Technology provides tools and content for people interested
          in quantitative finance and investing on pennyvault.com and subdomains,
          collectively known as the &quot;Site&quot; or &quot;website&quot;.
          Nothing on pennyvault.com, or any page within the pennyvault.com domain
          should be considered an offering or recommendation of securities or
          financial advice. This website is made available for educational and
          entertainment purposes only. Please read the following important terms
          and conditions (&quot;Terms of Service&quot;) carefully. These Terms of
          Service govern your access to and use of the Site. This is a legal
          agreement between you and Corwynn Technology. YOU UNDERSTAND THAT BY
          USING THE SITE, OR YOUR ACCOUNT, YOU ARE AGREEING TO BE BOUND BY THESE
          TERMS OF SERVICE. IF YOU DO NOT ACCEPT THESE TERMS OF SERVICE IN THEIR
          ENTIRETY, OR ANY SUBSEQUENT MODIFICATIONS THERETO, YOU MAY NOT ACCESS
          OR USE THE SITE.
        </p>

        <h3>Your Acceptance</h3>
        <p>
          Your use of the site is subject to this Terms of Service Agreement and
          the current Corwynn Technology Privacy Policy published at
          https://www.pennyvault.com/privacy-policy. Each time you use the Site,
          you agree to be bound by the following Terms of Service and our
          Privacy Policy. If you do not agree to all of these conditions, then
          you must immediately discontinue your use of the Site. Corwynn
          Technology may at any time revise or amend these Terms of Service,
          and it is your responsibility to review the Terms of Service for any
          changes each time you visit the Site. Your use of the Site following
          any revision or amendment of these Terms of Service will signify your
          assent to and acceptance of the revised Terms of Service. These Terms
          of Service apply to all customers, visitors, users, and others who
          view the Site (&quot;Users&quot;).
        </p>

        <h3>Links to Websites</h3>
        <p>
          The Site may contain links to third-party websites that are not owned
          or controlled by Corwynn Technology, including links provided by
          Users. Corwynn Technology has no control over, and assumes no
          responsibility for, the content, privacy policies, or practices of any
          third-party websites. By using the Site, you expressly relieve Corwynn
          Technology from any and all liability arising from your use of any
          third-party website. Accordingly, we encourage you to be aware when
          you leave the Site and to read the Terms of Service and privacy policy
          of other websites that you visit. Unless we expressly state otherwise,
          the fact that Corwynn Technology has provided a link to a site is
          not an endorsement, authorization, sponsorship, or affiliation with
          respect to such site, its owners, or its providers.
        </p>

        <h3>Information Disclaimer</h3>
        <p>
          The Site may provide certain financial market data, quotes, price
          forecasts, other forecasts, news, research, predictions, and opinions
          or other financial information (collectively &quot;Information&quot;)
          that has been independently obtained by certain financial market
          information services, financial and research publishers, various
          securities markets including stock exchanges and their affiliates,
          asset managers, investment bankers, and other providers (collectively
          the &quot;Information Providers&quot;) or has been obtained by Corwynn
          Technology from other sources including computer algorithms that may
          include guessing or other sources of random information. All data and
          Information is provided &quot;as is&quot; and the Information is
          intended solely as general information for educational and
          entertainment purposes only and is neither professional stock broker
          advice for any investment nor a substitute for other professional
          advice and services from qualified financial services providers
          familiar with your financial situation. Decisions based on Information
          contained within the Site are your sole responsibility. Always seek
          the advice of your financial advisor or other qualified financial
          services provider regarding any investment. The Information is
          provided with the understanding that Corwynn Technology is not
          engaged in rendering professional services or advice, and is not a
          registered investment advisor. Your use of the Site is subject to this
          disclaimer: Corwynn Technology assumes no responsibility for any
          consequences relating directly or indirectly to any action or inaction
          you take based on the Information or other material on this Site.
          Corwynn Technology does not guarantee or certify the accuracy,
          completeness, timeliness, or correct sequencing of the Information
          made available through Corwynn Technology, the Information
          Providers, or any other third party transmitting the Information (the
          &quot;Information Transmitters&quot;). You agree that Corwynn
          Technology, the Information Providers, and the Information
          Transmitters shall not be liable in any way for the accuracy,
          completeness, timeliness, or correct sequencing of the Information, or
          for any decision made or action taken by you relying upon the
          Information. You further agree that Corwynn Technology, the
          Information Providers, and the Information Transmitters will not be
          liable in any way for the interruption or cessation in the providing
          of any data, Information, or other aspect of the Site. Corwynn
          Technology is not responsible for, and makes no warranties regarding,
          the access, speed, or availability of the Internet in general or the
          Site in particular. Corwynn Technology reserves the right to modify
          or discontinue, temporarily or permanently, all or any portion of the
          Site with or without notice.
        </p>

        <h3>Use of the Site</h3>
        <p>
          Corwynn Technology hereby grants you permission to use the Site as
          set forth in these Terms of Service provided that you will comply with
          the Terms of Service and with any Information Providers' Terms of
          Service linked to the Site. Some of the Information on the Site
          provided by Information Providers, including but not limited to price
          and fundamentals data for stocks, funds or other securities, is
          licensed to us by others; therefore, your use of Information may be
          governed by an Information Provider's Terms of Service. You may use,
          print, copy, provide links to, and download content and results
          (&quot;Content&quot;) displayed on the Site for both commercial and
          non-commercial use where not explicitly forbidden by the Information
          Providers' Terms of Service. If you use the copied or downloaded
          content and results you agree to attribute the materials to their
          source and you agree to maintain all copyright and other proprietary
          notices contained on the materials. To access some features of the
          Site, you will have to register on the Site. You may never use another
          user's registration without permission. When registering, you must
          provide accurate and complete information. You are solely responsible
          for the activity that occurs under your registration, and you must
          keep your password secure. With the exception of applications commonly
          known as web browser software, or other applications formally approved
          by Corwynn Technology in writing, you agree not to use any software,
          program, application, or any other device to access or log on to the
          Site or to automate the process of obtaining, downloading,
          transferring, or transmitting any content, information, or quotes to
          or from the Site. You agree not to use or launch any automated system,
          including without limitation, &quot;robots,&quot; &quot;spiders,&quot;
          &quot;scrapers,&quot; or &quot;offline readers,&quot; to access the
          Site. Notwithstanding the foregoing, Corwynn Technology grants the
          operators of public search engines permission to use spiders to copy
          materials from the Site for the sole purpose of creating publicly
          available searchable indices of the materials. Corwynn Technology
          may permanently or temporarily terminate, suspend, or otherwise refuse
          to permit User's access to the Site without notice and liability, if
          in Corwynn Technology' sole determination, User violates any of the
          Terms of Service, including the following prohibited acts, which you
          agree not to perform; (i) use the Site for any illegal purpose or to
          submit, transmit or facilitate the distribution of information or
          content that is unlawful, illegal, harmful, abusive, racially or
          ethnically offensive, vulgar, obscene, sexually explicit, defamatory,
          infringing, invasive of personal privacy or publicity rights,
          harassing, libelous, threatening, or in a reasonable person's view,
          objectionable; (ii) attempt to interfere with, compromise the system
          integrity or security or decipher any transmissions to or from the
          servers running the Site; (iii) take any action that imposes an
          unreasonable or disproportionately large load on our infrastructure;
          (iv) upload invalid data, viruses, worms, or other software to the
          Site; (v) impersonate another person or otherwise misrepresent User's
          affiliation with a person or entity, conduct fraud, hide or attempt to
          hide User's identity; (vi) submit, upload, post, email, transmit or
          otherwise make available any Information or Content that User does not
          have a right to use or make available; (vii) interfere or attempt to
          interfere with the proper working of the Site; (viii) bypass the
          measures we may use to prevent or restrict access to the Site; or (ix)
          reverse engineer, reverse assemble or otherwise attempt to discover
          any source code.
        </p>

        <h3>Intellectual Property</h3>
        <p>
          Corwynn Technology or their third party data or content providers,
          including Information Providers, have exclusive proprietary rights to
          the Information provided on this Site. Content and the trademarks,
          service marks, trade names, icons, and logos contained therein
          (&quot;Marks&quot;), including without limitation are owned by Corwynn
          Technology or licensed to Corwynn Technology and owned by the
          Information Provider, and are subject to copyright and other
          intellectual property rights under United States and foreign laws and
          international conventions. Corwynn Technology and Information
          Providers retain all proprietary rights in the Content and Marks.
        </p>

        <h3>Warranty Disclaimer</h3>
        <p>
          THE INFORMATION PROVIDED THROUGH THE SITE IS PROVIDED &quot;AS IS&quot;
          AND &quot;AS AVAILABLE.&quot; YOU AGREE THAT YOUR USE OF THE SITE
          SHALL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW,
          CORWYNN TECHNOLOGY, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS
          DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE
          SITE AND YOUR USE THEREOF. CORWYNN TECHNOLOGY MAKES NO WARRANTIES OR
          REPRESENTATIONS ABOUT THE ACCURACY, ADEQUACY, TIMELINESS, OR
          COMPLETENESS OF THIS SITE'S CONTENT OR THE CONTENT OF ANY SITES LINKED
          TO THIS SITE AND ASSUMES NO LIABILITY OR RESPONSIBILITY FOR ANY (I)
          ERRORS, OMISSIONS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL
          INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM
          YOUR ACCESS TO AND USE OF THE SITE, (III) ANY UNAUTHORIZED ACCESS TO
          OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION
          AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION,
          DELAY OR CESSATION OF TRANSMISSION TO OR FROM THE SITE, (IV) ANY BUGS,
          VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR
          THROUGH THE SITE BY ANY THIRD PARTY, AND/OR (V) ANY ERRORS OR
          OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND
          INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, EMAILED,
          TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SITE. CORWYNN
          TECHNOLOGY PROVIDES NO GUARANTEE AGAINST THE POSSIBILITY OF
          DELETION, MIS-DELIVERY OR FAILURE TO STORE COMMUNICATIONS,
          PERSONALIZED SETTINGS, OR OTHER DATA. CORWYNN TECHNOLOGY DOES NOT
          WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT
          OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE SITE OR
          ANY HYPERLINKED WEBSITE OR FEATURED IN ANY BANNER OR OTHER
          ADVERTISING, AND CORWYNN TECHNOLOGY WILL NOT BE A PARTY TO OR IN ANY
          WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND
          THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF
          A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU
          SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
        </p>

        <h3>Limitation of Liability</h3>
        <p>
          IN NO EVENT SHALL CORWYNN TECHNOLOGY, ITS OFFICERS, DIRECTORS,
          EMPLOYEES, OR AGENTS, BE LIABLE TO YOU FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER RESULTING FROM
          ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL
          INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM
          YOUR ACCESS TO AND USE OF THE SITE, (III) ANY UNAUTHORIZED ACCESS TO
          OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION
          AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION OR
          CESSATION OF TRANSMISSION TO OR FROM THE SITE, (IV) ANY BUGS, VIRUSES,
          TROJAN HORSES, OR THE LIKE, WHICH MAY BE TRANSMITTED TO OR THROUGH THE
          SITE BY ANY THIRD PARTY, (V) ANY ERRORS OR OMISSIONS IN ANY CONTENT,
          (VI) YOUR USE, OR INABILITY TO USE, ANY PORTION OF THE SITE OR FOR ANY
          LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY
          CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA
          THE SITE, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER
          LEGAL THEORY, AND WHETHER OR NOT THE COMPANY IS ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES. THE FOREGOING LIMITATION OF LIABILITY
          SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW IN THE APPLICABLE
          JURISDICTION. THE SITE IS CONTROLLED AND OFFERED BY CORWYNN
          TECHNOLOGY FROM ITS FACILITIES IN THE UNITED STATES OF AMERICA.
          CORWYNN TECHNOLOGY MAKES NO REPRESENTATIONS THAT THE SITE IS
          APPROPRIATE OR AVAILABLE FOR USE IN OTHER COUNTRIES. THOSE WHO ACCESS
          OR USE THE SITE FROM OTHER JURISDICTIONS DO SO AT THEIR OWN VOLITION
          AND ARE RESPONSIBLE FOR COMPLIANCE WITH LOCAL LAW.
        </p>

        <h3>Indemnity</h3>
        <p>
          You agree to indemnify and hold Corwynn Technology and its
          affiliates, agents, employees, and licensors harmless from any and all
          claims, damages, obligations, losses, liabilities, costs or debt, and
          expenses (including but not limited to attorney's fees) arising from:
          (i) your use of and access to the Site; (ii) your violation of any
          term of these Terms of Service; (iii) your violation of any third
          party right, including without limitation any copyright, property, or
          privacy right. This defense and indemnification obligation will
          survive termination of these Terms of Service or discontinuance of
          your use of the Site.
        </p>

        <h3>Ability to Accept</h3>
        <p>
          By your use of the Site, you affirm that you are either are at least
          18 years of age, or an emancipated minor, or possess legal parental or
          guardian consent, and are fully able and competent to enter into the
          terms, conditions, obligations, affirmations, representations, and
          warranties set forth in these Terms of Service, and to abide by and
          comply with these Terms of Service. In any case, you affirm that you
          are 13 years old or older, as the Site is not intended for children
          under that age of 13. If you are under 13 years of age, do not use the
          Site.
        </p>

        <h3>Assignment</h3>
        <p>
          These Terms of Service and any rights and licenses granted hereunder
          may not be transferred or assigned by you, but may be assigned by
          Corwynn Technology without restriction, including without
          limitation, in the event that Corwynn Technology, LLC., forms a
          partnership with, is merged with, or is acquired by another company.
        </p>

        <h3>Terms and Termination</h3>
        <p>
          Your permission to access the Site under these Terms of Service will
          immediately terminate if you fail to comply with any term or
          condition. Upon such violation, you agree to terminate access to the
          Site. You agree that Corwynn Technology, in its sole discretion and
          with or without notice, may terminate your access to any or all of the
          Site, and remove and discard any Content within the Site. Corwynn
          Technology may also in its sole discretion with or without notice
          discontinue providing the Site. You also agree that Corwynn
          Technology will not be liable to you or any third party for any
          termination of your access to the Site.
        </p>

        <h3>Governing Law</h3>
        <p>
          You agree that Corwynn Technology and the Site are solely based in
          Arizona, that the Site is a passive website and that the Site does not
          give rise to personal jurisdiction over Corwynn Technology, either
          specific or general, in jurisdictions other than Arizona. You agree
          that these Terms of Service shall be governed and interpreted pursuant
          to the laws of the State of Arizona, notwithstanding any principles of
          conflict of law or your actual state or country of residence. You
          agree to submit to the personal and exclusive jurisdiction of the
          courts located within Tucson, Arizona.
        </p>

        <h3>Entire Agreement/Severability Waiver</h3>
        <p>
          These Terms of Service, together with the Privacy Policy and any other
          legal notices published by Corwynn Technology on the Site, shall
          constitute the entire agreement between you and Corwynn Technology
          concerning the Site. If any provision of these Terms of Service is
          deemed invalid by a court of competent jurisdiction, the invalidity of
          such provision shall not affect the validity of the remaining
          provisions of these Terms of Service, which shall remain in full force
          and effect.
        </p>

        <h3>No Waiver</h3>
        <p>
          No waiver of any provision of these Terms of Service shall be deemed a
          further or continuing waiver of such provision or any other provision,
          and Corwynn Technology' failure to assert any right under these
          Terms of Service shall not constitute a waiver of such right. YOU AND
          CORWYNN TECHNOLOGY AGREE THAT ANY CAUSE OF ACTION ARISING OUT OF OR
          RELATED TO THE SITE MUST COMMENCE WITHIN ONE (1) YEAR AFTER THE CAUSE
          OF ACTION ACCRUES. OTHERWISE, SUCH CAUSE OF ACTION IS PERMANENTLY
          BARRED.
        </p>

        <h3>Modifications</h3>
        <p>
          Corwynn Technology reserves the right, in its sole discretion, at
          any time to modify, discontinue or terminate the site, any portion
          thereof, or any content thereon without notice, or modify these Terms
          of Service. If any modified terms and conditions are not acceptable to
          you, your sole remedy is to cease using the site, and if applicable,
          cancel your Penny Vault account. By continuing to access or use the
          site after Corwynn Technology makes any such revision, you agree to
          be bound by the revised Terms of Service.
        </p>
      </div>
    </Dialog>
  </footer>
</template>

<style scoped>
.d-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
}
.d-footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: var(--text-4);
  flex-wrap: wrap;
}
.d-footer-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.sep {
  color: var(--text-5);
}
.version {
  font-variant-numeric: tabular-nums;
}
.d-footer-link {
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: var(--text-3);
  cursor: pointer;
  transition: color 160ms ease;
}
.d-footer-link:hover {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.d-footer-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>

<style>
.tos-dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}
.tos-content h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  margin-top: 18px;
  margin-bottom: 8px;
  letter-spacing: -0.005em;
}
.tos-content h3:first-child {
  margin-top: 0;
}
.tos-content p {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-2);
  margin: 0 0 12px;
}
</style>
