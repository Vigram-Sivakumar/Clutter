import type { Vault } from '@core/vault/models/Vault';
import { revealInFinder } from '@shared/helpers/revealInFinder';
import { downloadResource } from '@shared/helpers/downloadResource';
import { copyTextToClipboard } from '@shared/helpers/copyTextToClipboard';
import {
  getLocationPathRepresentations,
  pickLocationPathRepresentation,
  type LocationPathFormat,
} from '@core/presentation/getLocationPathRepresentations';

/**
 * The read-only, straight-from-`vault` resource actions (reveal in Finder,
 * copy path, download) shared by every resource-action entry point —
 * `AppLayout`'s resource overlay More Actions and `PageHost`'s
 * `MarkdownEditor`/Assets-row wiring. Previously duplicated verbatim in
 * both `Sidebar.tsx` and `PageHost.tsx`; extracted here so there is exactly
 * one implementation, per `docs/implementation-rules.md` §2 rule 4.
 */
export function createResourceLocationActions(vault: Vault) {
  function revealResourceInFinder(resourceId: string): void {
    const path = vault.getResource(resourceId)?.path;
    if (path) {
      void revealInFinder(path);
    }
  }

  function copyResourcePath(resourceId: string, format: LocationPathFormat): void {
    const resource = vault.getResource(resourceId);
    if (!resource) {
      return;
    }
    const representations = getLocationPathRepresentations(resource, 'resource', vault.root);
    const value = pickLocationPathRepresentation(representations, format);
    if (value !== null) {
      void copyTextToClipboard(value);
    }
  }

  function downloadResourceById(resourceId: string): void {
    const resource = vault.getResource(resourceId);
    if (resource) {
      void downloadResource(resource.path, resource.name);
    }
  }

  return { revealResourceInFinder, copyResourcePath, downloadResourceById };
}
