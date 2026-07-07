"use client";

import { useState } from "react";
import EditProfileModal from "./EditProfileModal";

export default function EditProfileButton({
  personId,
}: {
  personId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
      {open && (
        <EditProfileModal
          personId={personId}
          hideRoleField={false}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
