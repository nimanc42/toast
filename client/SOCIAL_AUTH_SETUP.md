# Social Authentication Setup Guide

This guide explains how to set up social authentication with Google and Apple for "A Toast to You" application.

## Prerequisites

1. A Supabase project (free tier is fine)
2. Developer accounts with Google and Apple (for OAuth keys)

## Supabase Configuration

1. Create a new project on [Supabase](https://supabase.com)
2. Once your project is created, go to Authentication > Providers
3. Enable Google and Apple providers
4. Follow the instructions below to set up each provider

### Required Environment Variables

After setup, you'll need to add these environment variables to your project:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The `VITE_` prefixed variables are used by the frontend, and the others are used by the backend.

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Set up your OAuth consent screen if prompted
6. Select "Web application" as the application type
7. Add your authorized domains:
   - For local development: `localhost`
   - For production: your actual domain
8. Add authorized redirect URIs:
   - For local development: `http://localhost:5000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
9. Create the client ID and note down your Client ID and Client Secret
10. In Supabase, go to Authentication > Providers > Google and input your Client ID and Client Secret

## Apple OAuth Setup

Setting up Apple Sign In is more complex and requires:

1. An Apple Developer account ($99/year)
2. A domain with SSL certificate
3. Setting up an App ID, Service ID, and private key

Detailed steps:

1. Go to the [Apple Developer Portal](https://developer.apple.com/account/)
2. Create an App ID (Identifiers > Register a New Identifier > App IDs)
   - Enable "Sign In with Apple" capability
3. Create a Services ID (Identifiers > Register a New Identifier > Services IDs)
   - Configure "Sign In with Apple" and set your return URL to `https://yourdomain.com/auth/callback`
4. Create a private key (Keys > Register a New Key)
   - Enable "Sign In with Apple" and download the key file
5. In Supabase, go to Authentication > Providers > Apple and input:
   - Service ID
   - Team ID (from your Apple Developer account)
   - Key ID
   - Private Key (the contents of the .p8 file you downloaded)

## Testing Social Authentication

Once you've set up the providers:

1. Restart your application
2. Visit the login page
3. Click "Sign in with Google" or "Sign in with Apple"
4. You should be redirected to the provider's login page
5. After successful authentication, you should be redirected back to your application

## Troubleshooting

- **Redirect errors**: Double-check the redirect URIs in both Supabase and the provider dashboards
- **Invalid client errors**: Verify your client IDs and secrets are correctly entered
- **CORS errors**: Ensure your domains are properly configured in the provider dashboards

If problems persist, check the browser console and server logs for detailed error messages.