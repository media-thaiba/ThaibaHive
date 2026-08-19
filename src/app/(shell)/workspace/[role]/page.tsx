'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceShell } from '@/components/workspaces/workspace-shell';
import { WorkspaceSkeleton } from '@/components/workspaces/workspace-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';

const VALID_ROLES = ['principal', 'teacher', 'cashier', 'parent'];

function mapUserRoleToWorkspace(userRole: string): string {
  switch (userRole) {
    case 'principal':
      return 'principal';
    case 'staff':
    case 'hod':
      return 'teacher';
    case 'accounts':
    case 'purchase':
      return 'cashier';
    default:
      return 'parent';
  }
}

export default function WorkspaceRolePage() {
  const params = useParams();
  const { staff, isLoading } = useAuth();
  const roleParam = typeof params.role === 'string' ? params.role : '';

  // Set document title (cannot use export metadata in client component)
  useEffect(() => {
    const formattedRole = roleParam ? roleParam.charAt(0).toUpperCase() + roleParam.slice(1) : '';
    document.title = `${formattedRole} Workspace | ThaibaHive`;
  }, [roleParam]);

  if (isLoading) {
    return <WorkspaceSkeleton />;
  }

  if (!staff) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Session Expired</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Please log in again to access your workspace.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Validate URL parameter
  if (!VALID_ROLES.includes(roleParam)) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Invalid Workspace</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              The workspace parameter <Badge variant="destructive">{roleParam}</Badge> is not recognized.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Authorize User Role against Workspace Parameter
  const mappedWorkspace = mapUserRoleToWorkspace(staff.role);
  if (mappedWorkspace !== roleParam && staff.role !== 'super_admin') {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <div className="text-sm text-muted-foreground mt-1 space-y-2">
              <div>You do not have permission to view the {roleParam} workspace.</div>
              <div className="text-xs text-muted-foreground mt-2">
                Your role (<Badge variant="secondary">{staff.role}</Badge>) maps to the{' '}
                <Badge variant="info">{mappedWorkspace}</Badge> workspace.
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <WorkspaceShell role={roleParam} />;
}
