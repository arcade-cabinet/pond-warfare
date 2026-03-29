export { CAMPAIGN_MISSIONS, getMission, type MissionDef, type MissionDialogue, type MissionObjective } from './missions';
export {
  campaignNotifyKilled,
  campaignNotifyTrained,
  campaignSuppressEnemyAttacks,
  campaignSystem,
  createCampaignState,
  type CampaignState,
  loadCampaignProgress,
  saveMissionCompleted,
} from './campaign-system';
