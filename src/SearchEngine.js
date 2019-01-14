class SearchEngine
{
    constructor(index, facetManager) {
        this.index = index;
        this.facetManager = facetManager;
        this.documents = [];
        this.sortedKeywords
    }

    indexDocument(id, doc, fields, facets) {
        for (let field of fields) {
            let value = doc.getNestedValue(field);

            if (typeof value !== undefined) {
                this.index.register(id, value);
            }
        }

        this.facetManager.add(id, doc, facets);
        this.documents[id] = doc;
    }

    doSearch(searchCallback, query, limit, selectedFacets, sortCallback) {
        let searchStart = performance.now();

        let foundIds = searchCallback(query);
        let timerQuery = performance.now();

        let facetedIds = this.facetManager.search(selectedFacets, foundIds);
        let timerFacets = performance.now();

        let ids = [...facetedIds.ids];

        if (sortCallback !== undefined) {
            ids.sort(function(first, second) {
                return this.sort(this.documents[first], this.documents[second]);
            }.bind({
                sort: sortCallback,
                documents: this.documents
            }));
        }

        let timerSort = performance.now();

        let count = ids.length,
            documents = ids.slice(0, limit)
            .map(function(id) {
                return this.documents[id];
            }.bind(this));

        let searchTime = performance.now() - searchStart;

        return {
            'query': query,
            'ids': ids,
            'count': count,
            'documents': documents,
            'facets': facetedIds.facets,
            'selectedFacets': selectedFacets,
            'took': searchTime,
            'timers': {
                'query': timerQuery - searchStart,
                'facets': timerFacets - timerQuery,
                'sort': timerSort - timerFacets,
                'documents': performance.now() - timerSort,
            }
        };
    }

    fuzzySearch(query, limit, selectedFacets, sortCallback) {
        let searchCallback = function(query) {
            return this.fuzzy(query);
        }.bind(this.index);

        return this.doSearch(searchCallback, query, limit, selectedFacets, sortCallback);
    }

    searchByPrefix(query, limit, selectedFacets, sortCallback) {
        let searchCallback = function(query) {
            return this.searchByPrefix(query);
        }.bind(this.index);

        return this.doSearch(searchCallback, query, limit, selectedFacets, sortCallback);
    }

    suggest(query, limit) {
        let suggestions = this.index.suggest(query, limit);
        return suggestions;
    }

    getFacets() {
        return this.facetManager.getFacets();
    }
}
