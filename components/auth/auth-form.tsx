'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SocialButton } from './social-button'
import { toast } from 'sonner'

type EmailMode = 'signin' | 'signup' | 'magic-link'

export function AuthForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailMode, setEmailMode] = useState<EmailMode>('signin')
  const [emailSent, setEmailSent] = useState(false)

  const handleSocialAuth = async (provider: 'google' | 'twitter') => {
    setIsLoading(true)
    try {
      const { error } = provider === 'google'
        ? await auth.signInWithGoogle()
        : await auth.signInWithTwitter()

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please use the email option below.')
        } else {
          toast.error(`Failed to sign in with ${provider}`)
          console.error(`${provider} auth error:`, error)
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Social auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      if (emailMode === 'magic-link') {
        const { error } = await auth.signInWithEmail(email)
        if (error) {
          toast.error(error.message || 'Failed to send magic link')
          console.error('Magic link error:', error)
        } else {
          setEmailSent(true)
          toast.success('Check your email for the magic link!')
        }
      } else if (emailMode === 'signup') {
        if (!password || password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setIsLoading(false)
          return
        }
        const { error } = await auth.signUpWithEmail(email, password, name || undefined)
        if (error) {
          toast.error(error.message || 'Failed to sign up')
          console.error('Sign up error:', error)
        } else {
          setEmailSent(true)
          toast.success('Check your email to confirm your account!')
        }
      } else {
        if (!password) {
          toast.error('Please enter your password')
          setIsLoading(false)
          return
        }
        const { error } = await auth.signInWithEmail(email, password)
        if (error) {
          toast.error(error.message || 'Invalid email or password')
          console.error('Sign in error:', error)
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Email auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          {emailMode === 'signup'
            ? "We've sent you a confirmation link. Please verify your email to continue."
            : "We've sent you a magic link to sign in to your account."}
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setEmailSent(false)
            setShowEmailForm(false)
            setEmailMode('signin')
          }}
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Social Auth Buttons */}
      <div className="space-y-3">
        <SocialButton
          provider="google"
          onClick={() => handleSocialAuth('google')}
          isLoading={isLoading}
        />
        <SocialButton
          provider="twitter"
          onClick={() => handleSocialAuth('twitter')}
          isLoading={isLoading}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email Auth */}
      {!showEmailForm ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => { setShowEmailForm(true); setEmailMode('signin') }}
            className="w-full"
          >
            Sign in with email
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setShowEmailForm(true); setEmailMode('signup') }}
            className="w-full text-muted-foreground"
          >
            Create an account
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {emailMode === 'signup' && (
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {emailMode !== 'magic-link' && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={emailMode === 'signup' ? 'Min 6 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={emailMode === 'signup' ? 6 : undefined}
              />
            </div>
          )}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading
              ? 'Loading...'
              : emailMode === 'signup'
                ? 'Create account'
                : emailMode === 'magic-link'
                  ? 'Send magic link'
                  : 'Sign in'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            {emailMode === 'signin' ? (
              <>
                <button
                  type="button"
                  onClick={() => setEmailMode('magic-link')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use magic link instead
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create account
                </button>
              </>
            ) : emailMode === 'signup' ? (
              <button
                type="button"
                onClick={() => setEmailMode('signin')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEmailMode('signin')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Use password instead
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowEmailForm(false)
              setEmailMode('signin')
              setPassword('')
              setName('')
            }}
            className="w-full"
          >
            Back
          </Button>
        </form>
      )}
    </div>
  )
}
