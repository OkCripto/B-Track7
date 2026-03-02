"use client";

import { UserButton } from "@clerk/nextjs";
import AccountSettingsProfilePage from "./AccountSettingsProfilePage";

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function DashboardAccountButton() {
  return (
    <UserButton
      afterSignOutUrl="/login"
      userProfileMode="modal"
      appearance={{
        elements: {
          avatarBox:
            "h-8 w-8 rounded-full border border-border bg-card text-foreground shadow-sm transition hover:opacity-90",
          userButtonPopoverRootBox:
            "max-md:!left-auto max-md:!right-2",
          userButtonPopoverCard:
            "border border-border bg-card/95 backdrop-blur max-md:ml-auto max-md:w-[15.5rem] max-md:max-w-[calc(100vw-1rem)] max-md:rounded-xl",
          userButtonPopoverMain: "max-md:p-1",
          userButtonPopoverActions: "max-md:py-0.5",
          userButtonPopoverActionButton:
            "max-md:min-h-8 max-md:rounded-lg max-md:px-2 max-md:py-1.5 max-md:text-[0.9rem]",
          userButtonPopoverActionButtonIconBox: "max-md:h-6 max-md:w-6",
          userButtonPopoverCustomItemButton:
            "max-md:min-h-8 max-md:rounded-lg max-md:px-2 max-md:py-1.5 max-md:text-[0.9rem]",
          userButtonPopoverCustomItemButtonIconBox: "max-md:h-6 max-md:w-6",
          userButtonPopoverFooter: "max-md:px-2 max-md:py-2",
          profileSectionPrimaryButton__emailAddresses: "hidden",
          menuButton__emailAddresses: "hidden",
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Action
          label="Settings"
          labelIcon={<SettingsIcon />}
          open="settings"
        />
      </UserButton.MenuItems>
      <UserButton.UserProfilePage
        label="Settings"
        url="settings"
        labelIcon={<SettingsIcon />}
      >
        <AccountSettingsProfilePage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
