# DynamoDB Single-Table Design Patterns

_Adapted from Alex DeBrie’s DynamoDB Book_

---

## Table of Contents

1. [Glossary](#glossary)
2. [General Principles](#general-principles)
3. [Pattern Selection Guide](#pattern-selection-guide)
4. [One-to-Many Relationships](#one-to-many-relationships)
5. [Many-to-Many Relationships](#many-to-many-relationships)
6. [Time-Series Data](#time-series-data)
7. [Filtering and Searching](#filtering-and-searching)
8. [GSI Patterns](#gsi-patterns)
9. [Implementation Notes](#implementation-notes)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Glossary

- **Item**: A record (row) in DynamoDB.
- **Attribute**: A property (column) of an item.
- **Primary Key**: Uniquely identifies an item. Two types:
  - **Simple Primary Key**: Just a partition key.
  - **Composite Primary Key**: Partition key + sort key.
- **Partition Key**: Determines the partition (physical storage location).
- **Sort Key**: Sorts and groups items within a partition.
- **Item Collection**: All items sharing the same partition key.
- **Global Secondary Index (GSI)**: Allows queries using alternative keys.
- **Local Secondary Index (LSI)**: Alternative sort key, must share the partition key.
- **Sparse Index**: GSI/LSI that only includes items with the indexed attribute(s).
- **Single-table Design**: Store all entities/types in a single table. Use keys, types, and indexes to model relationships.
- **Overloading Keys**: Reusing PK/SK attributes for multiple entity types or access patterns.

---

## General Principles

- **Single-table design** leverages composite keys, item types, and secondary indexes to support multiple access patterns in a single table.
- Relationships and entity types are often encoded using attribute values and/or sort key prefixes (e.g., `ORDER#2024-01-01`).
- Denormalization is the norm: duplicate or embed data as needed for query efficiency and to minimize round-trips.

---

## Pattern Selection Guide

**One-to-Many Relationships:**

- Child count < 10 AND no direct child access → Denormalization + Complex Attribute
- Need to query parent + children together → Composite Primary Key ⭐
- Children accessed independently → Secondary Index + Query

**Many-to-Many Relationships:**

- Simple relationships, low volume → Shallow Duplication
- Bidirectional queries needed → Adjacency List ⭐
- Complex graph relationships → Materialized Graph

---

## One-to-Many Relationships

A "parent" entity has multiple "child" entities (e.g., `Customer` → `Order`).

### Strategies

1. **Denormalization + Complex Attribute**

   - Embed children as a list/map in the parent item.
   - _Best when:_ No direct access to children is needed; child count is low (fits under 400KB).

2. **Denormalization + Duplication**

   - Duplicate parent attributes in each child.
   - _Best when:_ Parent info rarely changes; children are relatively few.

3. **Composite Primary Key (Recommended)**

   - Store parent and children in the same item collection (partition key = parent, sort key = type or child ID).
   - _Best when:_ Need to query both parent and children, or fetch all in one query.

   ```
   # Example:
   PK = CUSTOMER#123
   SK = CUSTOMER#123 (for parent)
   SK = ORDER#2024-01-01 (for child)
   ```

4. **Secondary Index + Query**

   - Use a GSI or LSI to group parents/children for a specific access pattern if main PK is needed for something else.

5. **Composite Sort Key**
   - Encode multi-level hierarchy in SK (e.g., `PROJECT#123#TASK#1`).

---

## Many-to-Many Relationships

Two entities, each with multiple related instances of the other (e.g., `Student` ↔ `Class`).

### Strategies

1. **Shallow Duplication**

   - Store minimal data from the related side.
   - _Best when:_ One side only needs a summary and child count is small.

2. **Adjacency List (Recommended)**

   - Model entities and their relationships explicitly as items.
   - Use primary key for one direction, GSI for the reverse.

   ```
   # Example:
   PK = STUDENT#123, SK = CLASS#ABC (represents enrollment)
   GSI1PK = CLASS#ABC, GSI1SK = STUDENT#123 (for reverse lookup)
   ```

3. **Materialized Graph**

   - Every relationship is its own item; GSIs index by each node.
   - _Best for:_ Highly flexible, complex relationships (think social graph).

4. **Normalization + Multiple Requests**
   - Store only IDs for relationships, fetch related items with additional queries.
   - _Best for:_ Highly mutable data, where duplication cost is high.

---

## Time-Series Data

- Encode time information in sort key (e.g., `EVENT#2024-05-27T19:00:00Z`).
- Use ISO 8601 for human-readability and proper sorting, or epoch for TTL/calculation.
- For large series, partition by prefix (e.g., `USER#123#2024-05`) to distribute storage.
- Query with sort key range operations (`BETWEEN`, `>=`, `<=`).

---

## Filtering and Searching

### Filtering

1. **Primary Key & Sort Key Filtering**

   - Most filtering is handled by PK and SK conditions.
   - Use composite SKs (e.g., `STATUS#SHIPPED#DATE#2024-05-27`) to support compound queries.

2. **Sparse Indexes**

   - Only items with indexed attributes appear in the index (e.g., only unread messages).
   - Use for "views" or special entity subsets.

3. **Filter Expressions**

   - Applied after the query, not during. Subject to 1MB pre-filter limit. Do **not** rely on filters to fix poor table design.

4. **Client-Side Filtering**
   - For complex or expensive filters, retrieve superset and filter in app logic.

### Searching

- No native full-text search; must index searchable fields as prefixes or use external search engine.
- Use GSIs for alternative query patterns or searching by other attributes.

---

## GSI Patterns

**Inverted Index Pattern:**

- Main table: PK=USER#123, SK=ORDER#456
- GSI: PK=ORDER#456, SK=USER#123 (reverse lookup)

**Sparse Index Pattern:**

- Only items with `Status=PENDING` appear in GSI
- Perfect for "todo lists" or "unprocessed items"

**Overloaded GSI Pattern:**

- GSI1PK serves multiple entity types
- GSI1PK=EMAIL#john@example.com (user lookup)
- GSI1PK=CATEGORY#electronics (product lookup)

---

## Implementation Notes

- **Sorting:** Sort keys are UTF-8 byte order; zero-pad numbers for correct order.
- **Updating Sort Keys:** Cannot update PK/SK; must delete and recreate item.
- **Ascending/Descending:** Use `ScanIndexForward: false` for descending order in Query API.
- **Uniqueness:** Enforce unique constraints using transactions; one item per unique attribute.
- **Pagination:** Always support paginated queries; return last evaluated key.
- **Singleton Items:** Use static partition keys for global settings/single records.
- **Reference Counts:** Maintain counts with transactions if needed (e.g., number of related items).

---

## Anti-Patterns to Avoid

❌ **Scan + FilterExpression** — Always use Query when possible  
❌ **Relational thinking** — Don’t normalize everything  
❌ **Generic attribute names** — Use descriptive PK/SK values  
❌ **Hot partitions** — Distribute load across partition keys  
❌ **Ignoring access patterns** — Design table for your queries, not your entities

---

## Example: Access Patterns for a Typical Single Table

- **Get all orders for a customer:** Query on `PK = CUSTOMER#123`, `SK BEGINS_WITH ORDER#`.
- **Get all students in a class:** Query GSI on `PK = CLASS#ABC`, `SK BEGINS_WITH STUDENT#`.
- **Get all events in a date range:** Query on `PK = USER#123`, `SK BETWEEN EVENT#2024-01-01 AND EVENT#2024-12-31`.
- **Get only unread messages:** Query on sparse GSI where only items with `Unread = true` are indexed.

---

_References:_

- Alex DeBrie, "The DynamoDB Book" (Cheatsheets PDF, 2020)
