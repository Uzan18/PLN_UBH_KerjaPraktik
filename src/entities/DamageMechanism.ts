import { Entity, PrimaryColumn, ManyToMany } from 'typeorm';
import type { Parameter } from './Parameter';

/**
 * DamageMechanism — master lookup table for damage mechanism names.
 * Related to Parameter via the junction table `parameter_damage_mechanism`.
 */
@Entity('damage_mechanism')
export class DamageMechanism {
  // @ts-expect-error - Override Function.name for TypeORM metadata resolution in Next.js SWC bundler
  static get name() { return 'DamageMechanism'; }

  @PrimaryColumn({ type: 'varchar', length: 100 })
  name!: string;

  @ManyToMany('Parameter', 'damageMechanisms')
  parameters!: Parameter[];
}
