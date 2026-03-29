export {
  type CampaignState,
  campaignNotifyKilled,
  campaignNotifyTrained,
  campaignSuppressEnemyAttacks,
  campaignSystem,
  createCampaignState,
  loadCampaignProgress,
  saveMissionCompleted,
} from './campaign-system';
export {
  CAMPAIGN_MISSIONS,
  getMission,
  type MissionDef,
  type MissionDialogue,
  type MissionObjective,
} from './missions';
