import { ITimetableFlightInfo } from "./ITimetableFlightInfo";

export interface ITimetableResponse {
    outboundFlights: ITimetableFlightInfo[];
    returnFlights: ITimetableFlightInfo[]
}
