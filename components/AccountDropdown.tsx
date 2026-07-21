'use client'

import { useSupabase } from '@/components/providers/supabase-provider'
import { User, Settings, LogOut, Trophy } from 'lucide-react'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import Link from 'next/link'

export function AccountDropdown() {
  const { user, signOut } = useSupabase()

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button variant="light" isIconOnly size="sm" className="h-8 w-8">
          <User className="h-4 w-4" />
          <span className="sr-only">Account menu</span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Account menu" className="w-48">
        {user ? (
          <DropdownItem
            key="user-info"
            isReadOnly
            className="opacity-100 cursor-default"
            textValue={user.email ?? 'Account'}
          >
            <p className="text-sm font-medium">{user.user_metadata?.name || user.email?.split('@')[0]}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </DropdownItem>
        ) : null}
        <DropdownItem
          key="settings"
          startContent={<Settings className="h-4 w-4" />}
          textValue="Settings"
          showDivider={!user}
          as={Link}
          href="/settings"
        >
          Settings
        </DropdownItem>
        <DropdownItem
          key="milestones"
          isDisabled
          startContent={<Trophy className="h-4 w-4" />}
          textValue="Milestones"
          showDivider
        >
          Milestones
        </DropdownItem>
        <DropdownItem
          key="sign-out"
          startContent={<LogOut className="h-4 w-4" />}
          textValue="Sign Out"
          onPress={() => signOut()}
        >
          Sign Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
