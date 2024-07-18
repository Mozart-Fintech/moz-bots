import { PublicMozbot, MozbotV6 } from '@mozbot.io/schemas'

export const convertPublicMozbotToMozbot = (
  mozbot: PublicMozbot,
  existingMozbot: MozbotV6
): MozbotV6 => {
  if (mozbot.version !== '6') return existingMozbot
  return {
    id: mozbot.mozbotId,
    version: mozbot.version,
    groups: mozbot.groups,
    edges: mozbot.edges,
    name: existingMozbot.name,
    publicId: existingMozbot.publicId,
    settings: mozbot.settings,
    theme: mozbot.theme,
    variables: mozbot.variables,
    customDomain: existingMozbot.customDomain,
    createdAt: existingMozbot.createdAt,
    updatedAt: existingMozbot.updatedAt,
    folderId: existingMozbot.folderId,
    icon: existingMozbot.icon,
    workspaceId: existingMozbot.workspaceId,
    isArchived: existingMozbot.isArchived,
    isClosed: existingMozbot.isClosed,
    resultsTablePreferences: existingMozbot.resultsTablePreferences,
    selectedThemeTemplateId: existingMozbot.selectedThemeTemplateId,
    whatsAppCredentialsId: existingMozbot.whatsAppCredentialsId,
    riskLevel: existingMozbot.riskLevel,
    events: mozbot.events,
  }
}
