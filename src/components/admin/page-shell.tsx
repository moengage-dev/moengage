import React from "react";

export function AdminPageShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}
