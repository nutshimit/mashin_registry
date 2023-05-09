// From https://github.com/octokit/webhooks, licensed under MIT: https://github.com/octokit/webhooks/blob/master/LICENSE

type PayloadRepositoryOwner = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name?: string;
  email?: string;
};

type PayloadRepository = {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: PayloadRepositoryOwner;
  html_url: string;
  description: null | string;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
  created_at: string | number;
  updated_at: string;
  pushed_at: string | number;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage: null | string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  forks_count: number;
  mirror_url: null;
  archived: boolean;
  disabled?: boolean;
  open_issues_count: number;
  license: null;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  stargazers?: number;
  master_branch?: string;
  permissions?: PayloadRepositoryPermissions;
};

type PayloadRepositoryPermissions = {
  pull: boolean;
  push: boolean;
  admin: boolean;
};

type WebhookPayloadCreateSender = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
};

export type WebhookPayloadCreate = {
  ref: string;
  ref_type: string;
  master_branch: string;
  description: null;
  pusher_type: string;
  repository: PayloadRepository;
  sender: WebhookPayloadCreateSender;
};

type WebhookPayloadPingSender = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
};

type WebhookPayloadPingHookLastResponse = {
  code: null;
  status: string;
  message: null;
};

type WebhookPayloadPingHookConfig = {
  content_type: string;
  url: string;
  insecure_ssl: string;
};

type WebhookPayloadPingHook = {
  type: string;
  id: number;
  name: string;
  active: boolean;
  events: Array<string>;
  config: WebhookPayloadPingHookConfig;
  updated_at: string;
  created_at: string;
  url: string;
  test_url: string;
  ping_url: string;
  last_response: WebhookPayloadPingHookLastResponse;
};

export type WebhookPayloadPing = {
  zen: string;
  hook_id: number;
  hook: WebhookPayloadPingHook;
  repository: PayloadRepository;
  sender: WebhookPayloadPingSender;
};

type WebhookPayloadPushSender = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
};

type WebhookPayloadPushPusher = { name: string; email: string };

export type WebhookPayloadPush = {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: null;
  compare: string;
  commits: Array<unknown>;
  head_commit: null;
  repository: PayloadRepository;
  pusher: WebhookPayloadPushPusher;
  sender: WebhookPayloadPushSender;
};

export type WebhookPayloadRelease = {
  action: string;
  release: PayloadRelease & {
    published_at: string;
  };
  repository: PayloadRepository;
  sender: PayloadUser;
};

export interface PayloadRelease {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  node_id: string;
  /**
   * The name of the tag.
   */
  tag_name: string;
  /**
   * Specifies the commitish value that determines where the Git tag is created from.
   */
  target_commitish: string;
  name: string;
  /**
   * Wether the release is a draft or published
   */
  draft: boolean;
  author: PayloadUser;
  /**
   * Whether the release is identified as a prerelease or a full release.
   */
  prerelease: boolean;
  created_at: string | null;
  published_at: string | null;
  assets: PayloadReleaseAsset[];
  tarball_url: string | null;
  zipball_url: string | null;
  body: string;
  mentions_count?: number;
  reactions?: PayloadReactions;
  discussion_url?: string;
}

export interface PayloadReleaseAsset {
  url: string;
  browser_download_url: string;
  id: number;
  node_id: string;
  /**
   * The file name of the asset.
   */
  name: string;
  label: string | null;
  /**
   * State of the release asset.
   */
  state: "uploaded";
  content_type: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  uploader?: PayloadUser;
}

export interface PayloadReactions {
  url: string;
  total_count: number;
  "+1": number;
  "-1": number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
}

export interface PayloadUser {
  login: string;
  id: number;
  node_id: string;
  name?: string;
  email?: string | null;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: "Bot" | "User" | "Organization";
  site_admin: boolean;
}
