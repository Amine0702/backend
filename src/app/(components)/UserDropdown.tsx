"use client";

import React, { useState } from "react";

import { SignedIn, UserButton } from "@clerk/nextjs";

export default function UserDropdown() {
  
  return (
    <div className="relative">
      <SignedIn>
        <UserButton />
      </SignedIn>
      

      
    </div>
  );
}
