<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'
import { useScrolled, useMounted } from '@/util/motion'
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import Drawer from 'primevue/drawer'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import type { PortfolioListItem } from '@/api/endpoints/portfolios'

// Theme — from Pinia UI store, toggleable via top-bar button
const ui = useUiStore()
const { theme: uiTheme } = storeToRefs(ui)
const isLight = computed(() => uiTheme.value === 'light')
function toggleTheme() {
  ui.toggleTheme()
}

// Sync .pv-dark class on <html> so PrimeVue portals (Dialog, Drawer, Menu)
// which render at document.body also pick up dark mode tokens.
import { watch } from 'vue'
function syncHtmlDarkClass(light: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('pv-dark', !light)
  }
}
syncHtmlDarkClass(isLight.value)
watch(isLight, (v) => syncHtmlDarkClass(v))

const scrolled = useScrolled(6)
const mounted = useMounted(60)

const router = useRouter()
const isMockMode = import.meta.env.VITE_USE_MOCKS === '1'
const auth = isMockMode ? null : useAuth0()

const accountDialogOpen = ref(false)

// Sidebar drawer
const sidebarOpen = ref(false)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
function sidebarNav(path: string) {
  sidebarOpen.value = false
  router.push(path)
}

// Search
import { usePortfolioList } from '@/composables/usePortfolioList'
const { data: allPortfolios } = usePortfolioList()
const searchQuery = ref('')
const searchFocused = ref(false)
const searchResults = computed<PortfolioListItem[]>(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q || !allPortfolios.value) return []
  return allPortfolios.value.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.benchmark ?? '').toLowerCase().includes(q)
  )
})

function selectSearchResult(id: string) {
  searchQuery.value = ''
  searchFocused.value = false
  router.push(`/portfolios/${id}`)
}

function onSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

// User info — from Auth0 in prod, mock data in dev
const userName = computed(() =>
  isMockMode ? 'Jeremy Fergason' : (auth?.user?.value?.name ?? 'User')
)
const userEmail = computed(() =>
  isMockMode ? 'jeremy@fergason.me' : (auth?.user?.value?.email ?? '')
)
const userPicture = computed(() => (isMockMode ? null : (auth?.user?.value?.picture ?? null)))
const userInitial = computed(() => {
  const source = userName.value?.trim() || userEmail.value?.trim() || ''
  return source.charAt(0).toUpperCase() || '?'
})

function openAccountDialog() {
  accountDialogOpen.value = true
}

function openAccountFromSidebar() {
  sidebarOpen.value = false
  openAccountDialog()
}

function logoutFromSidebar() {
  sidebarOpen.value = false
  handleLogout()
}

// User menu (PrimeVue Menu popup)
const userMenuRef = ref()
const userMenuItems = ref([
  {
    label: 'Account details',
    icon: 'pi pi-user',
    command: () => openAccountDialog()
  },
  {
    label: 'Help',
    icon: 'pi pi-question-circle',
    command: () => router.push('/help')
  },
  { separator: true },
  {
    label: 'Sign out',
    icon: 'pi pi-sign-out',
    class: 'p-menuitem-danger',
    command: () => handleLogout()
  }
])

function toggleUserMenu(event: Event) {
  userMenuRef.value.toggle(event)
}

function handleLogout() {
  if (isMockMode) {
    router.push('/')
  } else {
    auth?.logout({ logoutParams: { returnTo: window.location.origin } })
  }
}
</script>

<template>
  <div
    class="d-root"
    :class="{ 'is-mounted': mounted, 'theme-light': isLight, 'pv-dark': !isLight }"
  >
    <header class="d-top" :class="{ scrolled }">
      <div class="d-top-inner">
        <div class="d-top-l">
          <button class="icon-btn" title="Menu" aria-label="Toggle sidebar" @click="toggleSidebar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <router-link to="/portfolios" class="brand" aria-label="Go to portfolios">
            <span class="logo">
              <img src="/pv-icon-blue.jpg" alt="Penny Vault" width="22" height="22" />
            </span>
            <span class="brand-text">Penny Vault <span class="thin">Studio</span></span>
          </router-link>
        </div>

        <div class="d-top-search">
          <svg
            class="search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Search portfolios..."
            @focus="searchFocused = true"
            @blur="onSearchBlur"
          />
          <div v-if="searchFocused && searchQuery.trim()" class="search-dropdown">
            <div
              v-for="r in searchResults"
              :key="r.slug"
              class="search-result"
              @mousedown.prevent="selectSearchResult(r.slug)"
            >
              <div class="search-result-name">{{ r.name }}</div>
              <div class="search-result-meta">{{ r.benchmark }}</div>
            </div>
            <div v-if="!searchResults.length" class="search-empty">No results</div>
          </div>
        </div>

        <div class="d-top-r">
          <button
            class="icon-btn"
            :title="isLight ? 'Switch to dark mode' : 'Switch to light mode'"
            :aria-label="isLight ? 'Switch to dark mode' : 'Switch to light mode'"
            @click="toggleTheme"
          >
            <i :class="isLight ? 'pi pi-sun' : 'pi pi-moon'" />
          </button>
          <button class="av" aria-label="User menu" @click="toggleUserMenu">
            {{ userInitial }}
          </button>
          <Menu ref="userMenuRef" :model="userMenuItems" :popup="true" />
        </div>
      </div>
    </header>

    <!-- Sidebar drawer -->
    <Drawer v-model:visible="sidebarOpen" header="Penny Vault" position="left">
      <div class="sidebar-section">
        <div class="sidebar-label">Navigate</div>
        <button class="sidebar-item" @click="sidebarNav('/portfolios')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z" />
          </svg>
          Portfolios
        </button>
        <button class="sidebar-item" @click="sidebarNav('/strategies')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M3 12h4l3-9 4 18 3-9h4" />
          </svg>
          Strategies
        </button>
        <button class="sidebar-item" @click="sidebarNav('/help')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" />
            <line x1="12" y1="17" x2="12" y2="17.01" />
          </svg>
          Help
        </button>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">Account</div>
        <button class="sidebar-item" @click="openAccountFromSidebar">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Account details
        </button>
        <button class="sidebar-item danger" @click="logoutFromSidebar">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </Drawer>

    <!-- Account details dialog -->
    <Dialog
      v-model:visible="accountDialogOpen"
      header="Account details"
      modal
      :style="{ width: '400px' }"
    >
      <div class="dialog-body">
        <div class="account-avatar">
          <img v-if="userPicture" :src="userPicture" :alt="userName" />
          <span v-else class="account-avatar-fallback">{{ userName.charAt(0) }}</span>
        </div>
        <dl class="account-fields">
          <div class="account-field">
            <dt>Name</dt>
            <dd>{{ userName }}</dd>
          </div>
          <div class="account-field">
            <dt>Email</dt>
            <dd>{{ userEmail }}</dd>
          </div>
          <div v-if="!isMockMode" class="account-field">
            <dt>Provider</dt>
            <dd>Auth0</dd>
          </div>
        </dl>
      </div>
    </Dialog>

    <div class="d-body">
      <router-view />
    </div>

    <SiteFooter />
  </div>
</template>

<!-- Unscoped: CSS variables must cascade to all descendants (pages, components).
     The .reveal/.is-mounted rules must also reach page-level elements rendered
     inside <router-view>. -->
<style>
/* Tokens defined at :root so they cascade into teleported overlays
   (PrimeVue Dialog / Drawer / Popover / DatePicker panels render at
   document.body and need the variables available there). */
:root {
  /* ======== Dark theme tokens (default) ======== */
  --bg: #0f1419;
  --bg-alt: #0b1015;
  --panel: #141a20;
  --panel-hover: #171e26;
  --panel-big-end: #192230;
  --border: #1e2730;
  --divider: #141a20;

  --text-1: #e8edf2;
  --text-2: #c5cdd7;
  --text-3: #8593a3;
  --text-4: #6f7c8a;
  --text-5: #55606c;

  --primary: #3ba7ff;
  --primary-fg: #0f1419;
  --primary-soft-04: rgba(59, 167, 255, 0.04);
  --primary-soft-05: rgba(59, 167, 255, 0.05);
  --primary-soft-07: rgba(59, 167, 255, 0.07);
  --primary-soft-08: rgba(59, 167, 255, 0.08);
  --primary-soft-15: rgba(59, 167, 255, 0.15);
  --primary-soft-25: rgba(59, 167, 255, 0.25);
  --primary-border: rgba(59, 167, 255, 0.35);
  --primary-glow: rgba(59, 167, 255, 0.5);

  --secondary: #f7b84b;
  --secondary-soft-06: rgba(247, 184, 75, 0.06);
  --secondary-soft-15: rgba(247, 184, 75, 0.15);
  --secondary-border: rgba(247, 184, 75, 0.35);

  --gain: #7fd4a8;
  --gain-soft-15: rgba(127, 212, 168, 0.15);

  --loss: #ff6b6b;
  --loss-soft-15: rgba(255, 107, 107, 0.15);

  --muted-soft-14: rgba(111, 124, 138, 0.14);
  --muted-soft-15: rgba(111, 124, 138, 0.15);

  --shadow-up: 0 8px 24px -12px rgba(0, 0, 0, 0.6);
  --shadow-panel: 0 16px 32px -20px rgba(0, 0, 0, 0.5);
  --row-hover: rgba(59, 167, 255, 0.04);
  --row-hover-returns: rgba(59, 167, 255, 0.05);
  --bg-scrolled: rgba(11, 16, 21, 0.85);
  --hover-surface: rgba(255, 255, 255, 0.04);

  --grad-kpi-big: linear-gradient(135deg, var(--panel) 0%, var(--panel-big-end) 100%);
  --glow-kpi: radial-gradient(circle, rgba(59, 167, 255, 0.18), transparent 60%);
  --grad-focus-banner: linear-gradient(
    90deg,
    rgba(59, 167, 255, 0.1) 0%,
    rgba(59, 167, 255, 0.03) 100%
  );
  --grad-gain-to-warn: linear-gradient(90deg, var(--loss) 0%, var(--secondary) 100%);
  --grad-primary-to-gain: linear-gradient(90deg, var(--primary) 0%, var(--gain) 100%);
}

/* ======== Light theme overrides — applied when .pv-dark is absent
   on <html> (MainLayout toggles this class in sync with the store). ======== */
html:not(.pv-dark) {
  --bg: #f2f4f8;
  --bg-alt: #ffffff;
  --panel: #ffffff;
  --panel-hover: #f4f7fb;
  --panel-big-end: #eaf2fb;
  --border: #dde3ea;
  --divider: #eef1f5;

  --text-1: #121619;
  --text-2: #3a434d;
  --text-3: #6f7c8a;
  --text-4: #8d9aa8;
  --text-5: #a8b1bc;

  --primary: #0f62fe;
  --primary-fg: #ffffff;
  --primary-soft-04: rgba(15, 98, 254, 0.04);
  --primary-soft-05: rgba(15, 98, 254, 0.06);
  --primary-soft-07: rgba(15, 98, 254, 0.08);
  --primary-soft-08: rgba(15, 98, 254, 0.09);
  --primary-soft-15: rgba(15, 98, 254, 0.12);
  --primary-soft-25: rgba(15, 98, 254, 0.18);
  --primary-border: rgba(15, 98, 254, 0.38);
  --primary-glow: rgba(15, 98, 254, 0.4);

  --secondary: #d97706;
  --secondary-soft-06: rgba(217, 119, 6, 0.06);
  --secondary-soft-15: rgba(217, 119, 6, 0.14);
  --secondary-border: rgba(217, 119, 6, 0.4);

  --gain: #198038;
  --gain-soft-15: rgba(25, 128, 56, 0.14);

  --loss: #da1e28;
  --loss-soft-15: rgba(218, 30, 40, 0.12);

  --muted-soft-14: rgba(111, 124, 138, 0.12);
  --muted-soft-15: rgba(111, 124, 138, 0.14);

  --shadow-up: 0 8px 24px -12px rgba(20, 30, 50, 0.25);
  --shadow-panel: 0 16px 32px -20px rgba(20, 30, 50, 0.2);
  --row-hover: rgba(15, 98, 254, 0.04);
  --row-hover-returns: rgba(15, 98, 254, 0.05);
  --bg-scrolled: rgba(242, 244, 248, 0.88);
  --hover-surface: rgba(20, 30, 50, 0.06);

  --grad-kpi-big: linear-gradient(135deg, #ffffff 0%, #eaf2fb 100%);
  --glow-kpi: radial-gradient(circle, rgba(15, 98, 254, 0.14), transparent 60%);
  --grad-focus-banner: linear-gradient(
    90deg,
    rgba(15, 98, 254, 0.08) 0%,
    rgba(15, 98, 254, 0.02) 100%
  );
  --grad-gain-to-warn: linear-gradient(90deg, var(--loss) 0%, var(--secondary) 100%);
  --grad-primary-to-gain: linear-gradient(90deg, var(--primary) 0%, var(--gain) 100%);
}

.d-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-1);
  font-family: 'IBM Plex Sans', 'Inter', sans-serif;
  transition:
    background 260ms ease,
    color 260ms ease;
}

.num {
  font-variant-numeric: tabular-nums;
}

/* ============ ENTRANCE REVEAL ============ */
.reveal {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 500ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--d, 0ms);
}
.is-mounted .reveal {
  opacity: 1;
  transform: translateY(0);
}

/* ============ TOP BAR ============ */
.d-top {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 48px;
  background: var(--bg-alt);
  border-bottom: 1px solid transparent;
  transition:
    background 250ms ease,
    border-color 250ms ease,
    box-shadow 250ms ease;
}
.d-top-inner {
  max-width: 1440px;
  height: 100%;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.d-body {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
@media (max-width: 600px) {
  .d-body {
    padding: 0 16px;
  }
  .d-top-inner {
    padding: 0 8px;
    gap: 8px;
  }
}
.d-top.scrolled {
  background: var(--bg-scrolled);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border-bottom-color: var(--border);
  box-shadow: var(--shadow-up);
}

.d-top-l {
  display: flex;
  align-items: center;
  gap: 0;
}
.icon-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  position: relative;
  transition:
    color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}
.icon-btn:hover {
  color: var(--text-1);
  background: var(--hover-surface);
}
.icon-btn:active {
  transform: scale(0.94);
}
.icon-btn.sm {
  width: 28px;
  height: 28px;
}
@keyframes badge-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 6px;
  color: inherit;
  text-decoration: none;
  transition: color 160ms ease;
}
.brand:hover {
  color: var(--primary);
}
.brand-text {
  font-size: 14px;
  font-weight: 500;
}
.brand-text .thin {
  color: var(--text-3);
  font-weight: 400;
}
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--border);
  background: var(--bg-alt);
  transition: box-shadow 180ms ease;
}
.logo:hover {
  box-shadow: 0 0 0 2px var(--primary-border);
}
.logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.d-top-search {
  flex: 1;
  max-width: 520px;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px 0 32px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.search-input::placeholder {
  color: var(--text-5);
}
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.5);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}
.search-empty {
  padding: 16px 12px;
  font-size: 13px;
  color: var(--text-4);
  text-align: center;
}

.d-top-r {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.av {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--grad-primary-to-gain);
  color: var(--bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    box-shadow 200ms ease,
    transform 180ms ease;
  margin-left: 8px;
  transition: box-shadow 200ms ease;
}
.av:hover {
  box-shadow: 0 0 0 3px var(--primary-soft-25);
}

/* Sidebar nav items (kept for use inside PrimeVue Drawer) */
.sidebar-section {
  padding: 12px 10px;
}
.sidebar-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-4);
  padding: 6px 10px;
  margin-bottom: 2px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  font: inherit;
  font-size: 13.5px;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition:
    background 120ms ease,
    color 120ms ease;
}
.sidebar-item:hover {
  background: var(--hover-surface);
  color: var(--text-1);
}
.sidebar-item.disabled {
  opacity: 0.5;
  cursor: default;
}
.sidebar-item.disabled:hover {
  background: transparent;
  color: var(--text-2);
}
.sidebar-item.danger {
  color: var(--loss);
}
.sidebar-item.danger:hover {
  background: var(--loss-soft-15);
}
.sidebar-tag {
  margin-left: auto;
}

/* Account dialog body (kept for use inside PrimeVue Dialog) */
.dialog-body {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.account-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--grad-primary-to-gain);
  display: flex;
  align-items: center;
  justify-content: center;
}
.account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.account-avatar-fallback {
  font-size: 26px;
  font-weight: 600;
  color: var(--bg);
}
.account-fields {
  width: 100%;
  margin: 0;
}
.account-field {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.account-field:last-child {
  border-bottom: none;
}
.account-field dt {
  font-size: 13px;
  color: var(--text-3);
}
.account-field dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-1);
}

/* Search results (used inside PrimeVue AutoComplete option slot) */
.search-result {
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 100ms ease;
}
.search-result:hover {
  background: var(--hover-surface);
}
.search-result-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-1);
  margin-bottom: 2px;
}
.search-result-meta {
  font-size: 11px;
  color: var(--text-3);
}

/* PrimeVue Menu — size down and match theme */
:global(.p-menu) {
  font-size: 13px !important;
  padding: 6px !important;
  min-width: 200px !important;
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.5) !important;
}
:global(.p-menu .p-menuitem-link),
:global(.p-menu .p-menu-item-link) {
  padding: 10px 12px !important;
  font-size: 13px !important;
  color: var(--text-2) !important;
  border-radius: 6px !important;
  gap: 10px !important;
}
:global(.p-menu .p-menuitem-link:hover),
:global(.p-menu .p-menu-item-link:hover) {
  background: var(--hover-surface) !important;
  color: var(--text-1) !important;
}
:global(.p-menu .p-menuitem-icon),
:global(.p-menu .p-menu-item-icon) {
  font-size: 14px !important;
  color: var(--text-3) !important;
}
:global(.p-menu .p-menuitem-separator),
:global(.p-menu .p-menu-separator) {
  margin: 4px 8px !important;
  border-color: var(--border) !important;
}
:global(.p-menu .p-menuitem-danger .p-menuitem-link),
:global(.p-menu .p-menu-item-danger .p-menu-item-link) {
  color: var(--loss) !important;
}
:global(.p-menu .p-menuitem-danger .p-menuitem-link:hover),
:global(.p-menu .p-menu-item-danger .p-menu-item-link:hover) {
  background: var(--loss-soft-15) !important;
  color: var(--loss) !important;
}

/* PrimeVue Drawer — match theme */
:global(.p-drawer) {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  border-right: 1px solid var(--border) !important;
}
:global(.p-drawer-header) {
  padding: 16px 18px !important;
  border-bottom: 1px solid var(--border) !important;
}
:global(.p-drawer-title) {
  font-size: 15px !important;
  font-weight: 500 !important;
  color: var(--text-1) !important;
}
:global(.p-drawer-content) {
  padding: 8px !important;
  font-size: 13px !important;
}

/* PrimeVue Dialog — match theme */
:global(.p-dialog) {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
}
:global(.p-dialog-header) {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 16px 20px !important;
}
:global(.p-dialog-title) {
  font-size: 15px !important;
  font-weight: 500 !important;
}
:global(.p-dialog-content) {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  padding: 20px !important;
}
:global(.p-dialog-footer) {
  background: var(--panel) !important;
  border-top: 1px solid var(--border) !important;
  padding: 14px 20px !important;
}

/* Breadcrumb */
.d-breadcrumb {
  padding: 10px 24px;
  font-size: 12px;
  color: var(--text-3);
  display: flex;
  gap: 8px;
}
.d-breadcrumb a {
  color: var(--primary);
  cursor: pointer;
  text-decoration: none;
  position: relative;
}
.d-breadcrumb a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.d-breadcrumb a:hover::after {
  transform: scaleX(1);
}

/* Loading & error states */
.loading-skel {
  padding: 40px 24px;
  color: var(--text-3);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
  animation: ld-pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes ld-pulse {
  0% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
}
.error-banner {
  padding: 12px 14px;
  background: var(--loss-soft-15);
  color: var(--loss);
  border: 1px solid var(--loss);
  border-radius: 2px;
  font-size: 13px;
  margin: 16px 24px;
}

/* Responsive: top bar */
@media (max-width: 720px) {
  .d-top-search {
    display: none;
  }
}
@media (max-width: 420px) {
  .brand-text .thin {
    display: none;
  }
  .brand {
    padding: 0 8px 0 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .chip,
  .av {
    transition: none !important;
  }
}
</style>
