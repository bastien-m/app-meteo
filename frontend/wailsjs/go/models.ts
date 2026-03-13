export namespace data {
	
	export class LoadedDpt {
	    startDate: string;
	    endDate: string;
	    lines: number;
	    dpt: string;
	    filename: string;
	
	    static createFrom(source: any = {}) {
	        return new LoadedDpt(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.lines = source["lines"];
	        this.dpt = source["dpt"];
	        this.filename = source["filename"];
	    }
	}
	export class RainByStation {
	    NumPost: string;
	    Year: string;
	    Rain: number;
	
	    static createFrom(source: any = {}) {
	        return new RainByStation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.Year = source["Year"];
	        this.Rain = source["Rain"];
	    }
	}
	export class StationInfo {
	    NumPost: string;
	    CommonName: string;
	    Lat: number;
	    Lon: number;
	    Alti: number;
	
	    static createFrom(source: any = {}) {
	        return new StationInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.CommonName = source["CommonName"];
	        this.Lat = source["Lat"];
	        this.Lon = source["Lon"];
	        this.Alti = source["Alti"];
	    }
	}

}

