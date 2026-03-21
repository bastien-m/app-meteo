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
	export class RainData {
	    NumPost: string;
	    // Go type: time
	    Date: any;
	    Rain: number;
	
	    static createFrom(source: any = {}) {
	        return new RainData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.Date = this.convertValues(source["Date"], null);
	        this.Rain = source["Rain"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
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

