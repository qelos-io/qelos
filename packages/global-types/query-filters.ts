
export interface ICommonQueryFilters {
  $populate?: boolean;
  $sort?: string;
  $limit?: number;
  /** 1-based page number (used with $limit) */
  $page?: number;
  /** Number of results to skip. Takes precedence over $page when both are sent */
  $skip?: number;
  $flat?: boolean;  
}
