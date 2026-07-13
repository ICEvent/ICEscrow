import Principal "mo:base/Principal";

module {
    public type ServiceId = Nat;

    public type PricingModel = {
        #free;
        #donation;
        #fixed : Nat64;
        #hourly : Nat64;
        #quote;
    };

    public type Availability = {
        #always;
        #onDemand;
        #schedule : [Text];
    };

    public type Coverage = {
        cities : [Text];
        radius : ?Nat;
    };

    public type ServiceInfo = {
        id : ServiceId;
        provider : Principal;
        providerName : Text;
        providerPhone : ?Text;
        providerEmail : ?Text;
        providerWebsite : ?Text;
        owner : Principal;
        serviceTypes : [Text];
        keywords : [Text];
        pricing : PricingModel;
        availability : ?Availability;
        coverage : ?Coverage;
        capacity : ?Nat;
        createdAt : Int;
        updatedAt : Int;
    };

    public type NewServiceInfo = {
        provider : Principal;
        providerName : Text;
        providerPhone : ?Text;
        providerEmail : ?Text;
        providerWebsite : ?Text;
        serviceTypes : [Text];
        keywords : [Text];
        pricing : PricingModel;
        availability : ?Availability;
        coverage : ?Coverage;
        capacity : ?Nat;
    };

    public type UpdateServiceInfo = {
        provider : Principal;
        providerName : Text;
        providerPhone : ?Text;
        providerEmail : ?Text;
        providerWebsite : ?Text;
        serviceTypes : [Text];
        keywords : [Text];
        pricing : PricingModel;
        availability : ?Availability;
        coverage : ?Coverage;
        capacity : ?Nat;
    };
};
