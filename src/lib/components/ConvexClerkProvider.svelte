<script lang="ts">
  import type { Snippet } from 'svelte'
  import { ClerkProvider } from 'svelte-clerk/client'
  import { setupConvex } from 'convex-svelte'

  const { children }: { children: Snippet } = $props()

  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string

  setupConvex(convexUrl)

  // Retro arcade theme for Clerk components
  const clerkAppearance = {
    variables: {
      colorPrimary: '#ff2a6d',
      colorText: '#d1f7ff',
      colorTextSecondary: '#05d9e8',
      colorBackground: '#0a0a12',
      colorInputBackground: '#1a1a2e',
      colorInputText: '#d1f7ff',
      colorDanger: '#ff2a6d',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      borderRadius: '0px',
    },
    elements: {
      card: {
        backgroundColor: '#0a0a12',
        border: '2px solid #05d9e8',
        boxShadow: '2px 2px 0 #ff2a6d, -2px -2px 0 #9d4edd, 0 0 20px rgba(5, 217, 232, 0.3)',
      },
      headerTitle: {
        color: '#ff2a6d',
        textShadow: '0 0 10px #ff2a6d',
      },
      headerSubtitle: {
        color: '#4a5568',
      },
      socialButtonsBlockButton: {
        backgroundColor: 'transparent',
        border: '1px solid #05d9e8',
        color: '#05d9e8',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
      },
      socialButtonsBlockButtonText: {
        color: '#05d9e8',
      },
      formButtonPrimary: {
        backgroundColor: 'transparent',
        border: '2px solid #ff2a6d',
        color: '#ff2a6d',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        textTransform: 'uppercase',
      },
      formFieldInput: {
        backgroundColor: '#1a1a2e',
        border: '1px solid #05d9e8',
        color: '#d1f7ff',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
      },
      formFieldLabel: {
        color: '#05d9e8',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        textTransform: 'uppercase',
      },
      footerActionLink: {
        color: '#05d9e8',
      },
      dividerLine: {
        backgroundColor: '#4a5568',
      },
      dividerText: {
        color: '#4a5568',
      },
      identityPreviewEditButton: {
        color: '#05d9e8',
      },
      formFieldInputShowPasswordButton: {
        color: '#05d9e8',
      },
      otpCodeFieldInput: {
        backgroundColor: '#1a1a2e',
        border: '1px solid #05d9e8',
        color: '#d1f7ff',
      },
    },
  }
</script>

<ClerkProvider {publishableKey} appearance={clerkAppearance}>
  {@render children()}
</ClerkProvider>
