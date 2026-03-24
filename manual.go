// This is a manually written file - should NOT be auto-viewed

package model

// ManualStruct is hand-crafted business logic
type ManualStruct struct {
	ID   int64
	Name string
}

// DoSomething does something important
func (m *ManualStruct) DoSomething() error {
	// important business logic here
	return nil
}
