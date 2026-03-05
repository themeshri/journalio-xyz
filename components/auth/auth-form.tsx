'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SocialButton } from './social-button'
import { toast } from 'sonner'

export function AuthForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
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
      // Success will be handled by the auth state change
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Social auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const { error } = await auth.signInWithEmail(email)
      
      if (error) {
        toast.error(error.message || 'Failed to send magic link')
        console.error('Email auth error:', error)
      } else {
        setEmailSent(true)
        toast.success('Check your email for the magic link!')
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
        <div className="text-emerald-600 text-lg">📧</div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We've sent you a magic link to sign in to your account.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setEmailSent(false)
            setShowEmailForm(false)
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
            Or continue with
          </span>
        </div>
      </div>

      {/* Email Auth */}
      {!showEmailForm ? (
        <Button
          variant="outline"
          onClick={() => setShowEmailForm(true)}
          className="w-full"
        >
          📧 Continue with Email
        </Button>
      ) : (
        <form onSubmit={handleEmailAuth} className="space-y-3">
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
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowEmailForm(false)}
            className="w-full"
          >
            Back to social login
          </Button>
        </form>
      )}
    </div>
  )
}