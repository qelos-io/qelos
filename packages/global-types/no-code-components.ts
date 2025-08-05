export interface INoCodeComponent {
  /**
   * MongoDB document ID
   */
  _id?: string;
  
  /**
   * Tenant identifier
   */
  tenant: string;
  
  /**
   * Unique identifier for the component
   */
  identifier: string;
  
  /**
   * Name of the component used in templates
   */
  componentName: string;
  
  /**
   * Optional description of the component
   */
  description?: string;
  
  /**
   * Creation timestamp
   */
  created: string | Date;
  
  /**
   * Last update timestamp
   */
  updated: string | Date;

  /**
   * Additional component properties can be added here as the schema evolves
   */
  [key: string]: any;
}