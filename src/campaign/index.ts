export {
  type CampaignState,
  campaignNotifyKilled,
  campaignNotifyTrained,
  campaignSuppressEnemyAttacks,
  campaignSystem,
  createCampaignState,
  loadBranchChoice,
  loadCampaignProgress,
  saveBranchChoice,
  saveMissionCompleted,
} from './campaign-system';
export {
  BRANCH_MISSIONS,
  CAMPAIGN_MISSIONS,
  getMission,
  type MissionDef,
  type MissionDialogue,
  type MissionObjective,
} from './missions';
