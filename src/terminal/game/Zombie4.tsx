import { BaseCharacter } from './BaseCharacter';
import { Zombie4Actions } from './ActionTypes';

// * Idle - 5 frames
// * Walk - 13 frames
// * Attack - 15 frames
// * Hurt - 7 frames
// * Death - 12 frames
// * Spawn - 10 frames
// There are 6 animations. All frames are on a 62x62 "canvas."

export class Zombie4 extends BaseCharacter {
  constructor(context: CanvasRenderingContext2D) {
    super(context);
    // Load sprites for different animations
    this.loadActions(Zombie4Actions);
  }
}