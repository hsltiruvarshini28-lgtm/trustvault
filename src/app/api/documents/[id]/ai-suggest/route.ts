import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { PermissionLevel } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Only the document owner or an administrator can request AI suggestions
  if (doc.owner_id !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only the document owner or an administrator can request access suggestions.' },
      { status: 403 }
    );
  }

  // Identify eligible candidate users (active users, not the owner, not already active)
  const allProfiles = dataStore.getAllProfiles();
  const activeGrants = dataStore.getDocumentPermissions(doc.id).filter((p) => p.revoked_at === null);
  const activeUserIds = new Set(activeGrants.map((g) => g.user_id));

  const candidates = allProfiles.filter(
    (p) => p.status === 'ACTIVE' && p.id !== doc.owner_id && !activeUserIds.has(p.id)
  );

  if (candidates.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'All active users already hold active permissions for this document.',
    }, { status: 400 });
  }

  // AI Recommendation Engine: Determine least-privilege suggested grant and security rationale
  const targetCandidate = candidates[0];
  let suggestedPermission: PermissionLevel = 'READ';
  let rationale = `Recommended least-privilege READ access for ${doc.category} document review based on active account status.`;

  const catLower = doc.category.toLowerCase();
  if (catLower === 'engineering') {
    suggestedPermission = 'EDIT';
    rationale = `Engineering documentation frequently requires peer updates and metadata adjustments. Suggesting EDIT access under least-privilege policy.`;
  } else if (catLower === 'finance' || catLower === 'executive' || catLower === 'legal') {
    suggestedPermission = 'READ';
    rationale = `Classified as ${doc.category} confidential material. Zero-trust least-privilege mandates READ-only access to prevent unauthorized modification.`;
  }

  // Append AI_ACCESS_SUGGESTION event to tamper-evident cryptographic audit trail
  dataStore.recordAiSuggestion(
    user,
    doc.id,
    targetCandidate.id,
    suggestedPermission,
    rationale
  );

  return NextResponse.json({
    success: true,
    suggestion: {
      candidate: {
        id: targetCandidate.id,
        full_name: targetCandidate.full_name,
        email: targetCandidate.email,
        role: targetCandidate.role,
      },
      suggestedPermission,
      rationale,
      policyNotice:
        'Zero-trust security policy: AI recommendations are strictly advisory and never widen access on their own. Document owner confirmation is required.',
    },
  });
}
