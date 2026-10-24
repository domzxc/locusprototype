import type {Attendance,Config,CrewAvailability} from './src/types';
export function assumedAttendance(fleet:{A:number;B:number}):Attendance;
export function validateAttendance(value:unknown):void;
export function crewAvailability(config:Config,fleet:{A:number;B:number}):CrewAvailability;
