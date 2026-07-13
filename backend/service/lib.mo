import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";

import Types "types";

module {
    private func natHash(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) };

    public class Services(stableServiceId : Nat, stableServices : [(Types.ServiceId, Types.ServiceInfo)]) {
        private var nextId : Nat = stableServiceId;
        private var services = TrieMap.TrieMap<Types.ServiceId, Types.ServiceInfo>(Nat.equal, natHash);
        services := TrieMap.fromEntries<Types.ServiceId, Types.ServiceInfo>(Iter.fromArray(stableServices), Nat.equal, natHash);

        public func toStable() : [(Types.ServiceId, Types.ServiceInfo)] {
            Iter.toArray(services.entries())
        };

        public func toStableId() : Nat {
            nextId
        };

        public func create(data : Types.NewServiceInfo, owner : Principal) : Types.ServiceId {
            let id = nextId;
            let now = Time.now();
            let service : Types.ServiceInfo = {
                id;
                provider = data.provider;
                owner;
                serviceTypes = data.serviceTypes;
                keywords = data.keywords;
                pricing = data.pricing;
                availability = data.availability;
                coverage = data.coverage;
                capacity = data.capacity;
                createdAt = now;
                updatedAt = now;
            };
            services.put(id, service);
            nextId += 1;
            id
        };

        public func update(id : Types.ServiceId, data : Types.UpdateServiceInfo) : Result.Result<Types.ServiceId, Text> {
            switch (services.get(id)) {
                case (?service) {
                    services.put(id, {
                        id = service.id;
                        provider = data.provider;
                        owner = service.owner;
                        serviceTypes = data.serviceTypes;
                        keywords = data.keywords;
                        pricing = data.pricing;
                        availability = data.availability;
                        coverage = data.coverage;
                        capacity = data.capacity;
                        createdAt = service.createdAt;
                        updatedAt = Time.now();
                    });
                    #ok(id)
                };
                case null { #err("no service found") };
            }
        };

        public func delete(id : Types.ServiceId) : ?Types.ServiceInfo {
            services.remove(id)
        };

        public func retrieve(id : Types.ServiceId) : ?Types.ServiceInfo {
            services.get(id)
        };

        public func list() : [Types.ServiceInfo] {
            Iter.toArray(services.vals())
        };
    }
}
